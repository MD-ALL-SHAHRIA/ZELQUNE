import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  APP_CONFIG,
  AppError,
  currentActor,
  OutboxService,
  recordAudit,
  requestContext,
} from '@zelqune/common';
import {
  type AdminOrderDetailCore,
  type AdminOrderExportQuery,
  type AdminOrderList,
  type AdminOrderListQuery,
  type AdminOrderSummary,
  customerFriendFlagChanged,
  MAX_EXPORT_ROWS,
  normalizeBdPhone,
  orderCancelled,
  orderConfirmed,
  type OrderStatus,
  orderStatusChanged,
  type OrderTrackingCore,
  transitionOrderInputSchema,
  type TransitionOrderInput,
  type TrackQuery,
} from '@zelqune/contracts';
import { type OrderEnv } from '../config/order-env';
import { customerKey } from '../domain/customer-key';
import { canTransitionOrder } from '../domain/order-state';
import { type Order, type Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;
type CancelReason = 'PAYMENT_TIMEOUT' | 'STOCK_HOLD_EXPIRED' | 'ADMIN' | 'CUSTOMER';
const SOURCE = 'order-service';
const SWEEP_BATCH = 100;
/** Admin date filters are calendar days in Bangladesh time. */
const BD_OFFSET = '+06:00';

@Injectable()
export class OrderService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(OrderService.name);
  private sweepTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    @Inject(APP_CONFIG) private readonly config: OrderEnv,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.NODE_ENV === 'test') return;
    this.sweepTimer = setInterval(
      () => void this.sweepSafely(),
      this.config.ORDER_SWEEP_INTERVAL_MS,
    );
  }

  onModuleDestroy(): void {
    clearInterval(this.sweepTimer);
  }

  /** Public tracking: the same 404 for an unknown code and a wrong phone. */
  async track({ code, phone }: TrackQuery): Promise<OrderTrackingCore> {
    const order = await this.prisma.order.findUnique({
      where: { code },
      include: { items: true, history: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order || order.customerPhone !== phone)
      throw new AppError('ORDER_NOT_FOUND', 'No order with this code and phone number', 404);
    return {
      orderId: order.id,
      code: order.code,
      status: order.status,
      saleMode: order.saleMode,
      placedAt: order.createdAt.toISOString(),
      items: this.items(order.items),
      totals: this.totals(order),
      history: order.history.map((h) => ({ status: h.to, at: h.createdAt.toISOString() })),
    };
  }

  /** payment.verified: a pending order becomes CONFIRMED (emits order.confirmed). */
  async confirmFromPayment(orderId: string, tx: Tx): Promise<void> {
    const order = await this.lock(tx, orderId);
    if (!order) return; // payment for a checkout that never completed
    if (order.status !== 'PENDING_PAYMENT') {
      this.logger.warn(`payment.verified for order ${order.code} in ${order.status}; no change`);
      return;
    }
    await this.apply(tx, order, 'CONFIRMED', 'payment-service', null);
  }

  /** Cancels a still-pending order (stock hold expired, payment timeout). */
  async cancelIfPending(orderId: string, reason: CancelReason, tx: Tx): Promise<boolean> {
    const order = await this.lock(tx, orderId);
    if (order?.status !== 'PENDING_PAYMENT') return false;
    await this.apply(tx, order, 'CANCELLED', 'system', reason);
    return true;
  }

  /** Cancels every order still PENDING_PAYMENT after ORDER_HOLD_HOURS (pre-orders included). */
  async cancelUnpaid(now = new Date()): Promise<number> {
    const cutoff = new Date(now.getTime() - this.config.ORDER_HOLD_HOURS * 3_600_000);
    const due = await this.prisma.order.findMany({
      where: { status: 'PENDING_PAYMENT', createdAt: { lte: cutoff } },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
      take: SWEEP_BATCH,
    });
    let cancelled = 0;
    for (const { id } of due) {
      if (await this.prisma.$transaction((tx) => this.cancelIfPending(id, 'PAYMENT_TIMEOUT', tx)))
        cancelled++;
    }
    return cancelled;
  }

  /** Admin status change. Audited. */
  async transition(raw: TransitionOrderInput): Promise<{ status: OrderStatus }> {
    const input = transitionOrderInputSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lock(tx, input.orderId);
      if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
      const reason = input.reason ?? (input.to === 'CANCELLED' ? 'ADMIN' : null);
      await this.apply(tx, order, input.to, input.actor, reason);
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'order.transition',
        entityType: 'order',
        entityId: order.id,
        summary: `${order.code}: ${order.status} -> ${input.to}${reason ? ` (${reason})` : ''}`,
        changes: { from: order.status, to: input.to, reason },
      });
      return { status: input.to };
    });
  }

  // ---------------- admin queries ----------------

  async list(query: AdminOrderListQuery): Promise<AdminOrderList> {
    const where = await this.where(query);
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    const friends = await this.friendPhones(rows.map((r) => r.customerPhone));
    return {
      items: rows.map((r) => this.summary(r, friends)),
      page: query.page,
      limit: query.limit,
      total,
    };
  }

  /** Up to MAX_EXPORT_ROWS orders for the CSV export, newest first. */
  async exportRows(query: AdminOrderExportQuery): Promise<AdminOrderSummary[]> {
    const rows = await this.prisma.order.findMany({
      where: await this.where(query),
      orderBy: { createdAt: 'desc' },
      take: MAX_EXPORT_ROWS,
    });
    const friends = await this.friendPhones(rows.map((r) => r.customerPhone));
    return rows.map((r) => this.summary(r, friends));
  }

  async detail(orderId: string): Promise<AdminOrderDetailCore> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        history: { orderBy: { createdAt: 'asc' } },
        notes: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
    const friends = await this.friendPhones([order.customerPhone]);
    const address = order.address as {
      district: string;
      area: string;
      line: string;
      note?: string | null;
    };
    return {
      ...this.summary(order, friends),
      address: {
        district: address.district,
        area: address.area,
        line: address.line,
        note: address.note ?? null,
      },
      items: this.items(order.items),
      totals: this.totals(order),
      history: order.history.map((h) => ({
        from: h.from,
        to: h.to,
        actor: h.actor,
        reason: h.reason,
        at: h.createdAt.toISOString(),
      })),
      notes: order.notes.map((n) => ({
        id: n.id,
        author: n.authorId,
        text: n.text,
        at: n.createdAt.toISOString(),
      })),
      utm: (order.utm as Record<string, string> | null) ?? null,
      organizationId: order.organizationId,
      quoteCode: null,
      cancelReason: order.cancelReason,
    };
  }

  async idByCode(code: string): Promise<string> {
    const order = await this.prisma.order.findUnique({ where: { code }, select: { id: true } });
    if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
    return order.id;
  }

  async addNote(orderId: string, text: string): Promise<{ id: string }> {
    const actor = currentActor();
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
      const note = await tx.orderNote.create({
        data: { orderId, authorId: actor.id, authorRole: actor.role, text },
      });
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'order.addNote',
        entityType: 'order',
        entityId: orderId,
        summary: `${order.code}: note added`,
        changes: { noteId: note.id },
      });
      return { id: note.id };
    });
  }

  /** Friends & family never count toward GO. Applies to every order placed with the phone. */
  async setFriend(
    rawPhone: string,
    isFriend: boolean,
  ): Promise<{ phone: string; isFriend: boolean }> {
    const phone = normalizeBdPhone(rawPhone);
    if (!phone) throw new AppError('INVALID_PHONE', 'Not a Bangladeshi mobile number', 422);
    const actor = currentActor();
    return this.prisma.$transaction(async (tx) => {
      await tx.customer.upsert({
        where: { phone },
        create: { phone, isFriend, updatedBy: actor.id },
        update: { isFriend, updatedBy: actor.id },
      });
      const key = customerKey(this.config.CUSTOMER_KEY_SECRET, phone);
      const meta = { source: SOURCE, requestId: requestContext.requestId() };
      await this.outbox.add(
        tx,
        customerFriendFlagChanged.create(
          { customerKey: key, isFriend, changedAt: new Date().toISOString() },
          meta,
        ),
      );
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'customer.setFriend',
        entityType: 'customer',
        entityId: key,
        summary: `Customer ${phone.slice(0, 7)}****** marked ${isFriend ? 'friend' : 'not friend'}`,
        changes: { isFriend },
      });
      return { phone, isFriend };
    });
  }

  private async apply(
    tx: Tx,
    order: Order,
    to: OrderStatus,
    actor: string,
    reason: string | null,
  ): Promise<void> {
    if (!canTransitionOrder(order.status, to, order.saleMode)) {
      throw new AppError(
        'INVALID_ORDER_TRANSITION',
        `Cannot move order from ${order.status} to ${to}`,
        409,
      );
    }
    const now = new Date();
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: to,
        ...(to === 'CONFIRMED' ? { confirmedAt: now } : {}),
        ...(to === 'CANCELLED' ? { cancelledAt: now, cancelReason: reason } : {}),
        history: { create: { from: order.status, to, actor, reason } },
      },
    });
    const meta = { source: SOURCE, requestId: requestContext.requestId() };
    // Every transition, so analytics can follow orders past CONFIRMED (ADR 0010).
    await this.outbox.add(
      tx,
      orderStatusChanged.create(
        {
          orderId: order.id,
          code: order.code,
          from: order.status,
          to,
          channel: order.channel,
          changedAt: now.toISOString(),
        },
        meta,
      ),
    );
    if (to === 'CONFIRMED') {
      await this.outbox.add(
        tx,
        orderConfirmed.create(
          { orderId: order.id, code: order.code, confirmedAt: now.toISOString() },
          meta,
        ),
      );
    }
    if (to === 'CANCELLED') {
      const cancelReason =
        (['PAYMENT_TIMEOUT', 'STOCK_HOLD_EXPIRED', 'ADMIN', 'CUSTOMER'] as const).find(
          (r) => r === reason,
        ) ?? 'ADMIN';
      await this.outbox.add(
        tx,
        orderCancelled.create(
          {
            orderId: order.id,
            code: order.code,
            reason: cancelReason,
            cancelledAt: now.toISOString(),
          },
          meta,
        ),
      );
    }
  }

  private async where(query: AdminOrderExportQuery): Promise<Prisma.OrderWhereInput> {
    const and: Prisma.OrderWhereInput[] = [];
    if (query.status) and.push({ status: query.status });
    if (query.channel) and.push({ channel: query.channel });
    if (query.saleMode) and.push({ saleMode: query.saleMode });
    if (query.paymentMethod) and.push({ paymentMethod: query.paymentMethod });
    if (query.from)
      and.push({ createdAt: { gte: new Date(`${query.from}T00:00:00${BD_OFFSET}`) } });
    if (query.to)
      and.push({ createdAt: { lte: new Date(`${query.to}T23:59:59.999${BD_OFFSET}`) } });
    if (query.q) {
      const phone = normalizeBdPhone(query.q);
      and.push({
        OR: [
          { code: { contains: query.q.toUpperCase() } },
          { customerName: { contains: query.q, mode: 'insensitive' } },
          ...(phone ? [{ customerPhone: phone }] : []),
        ],
      });
    }
    if (query.isFriend !== undefined) {
      const friends = await this.prisma.customer.findMany({
        where: { isFriend: true },
        select: { phone: true },
      });
      const phones = friends.map((c) => c.phone);
      and.push(
        query.isFriend ? { customerPhone: { in: phones } } : { customerPhone: { notIn: phones } },
      );
    }
    return and.length ? { AND: and } : {};
  }

  private async friendPhones(phones: string[]): Promise<Set<string>> {
    if (phones.length === 0) return new Set();
    const rows = await this.prisma.customer.findMany({
      where: { phone: { in: [...new Set(phones)] }, isFriend: true },
    });
    return new Set(rows.map((r) => r.phone));
  }

  private summary(o: Order, friends: Set<string>): AdminOrderSummary {
    return {
      id: o.id,
      code: o.code,
      channel: o.channel,
      status: o.status,
      saleMode: o.saleMode,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      isFriend: friends.has(o.customerPhone),
      paymentMethod: o.paymentMethod,
      subtotalPaisa: o.subtotalPaisa,
      shippingFeePaisa: o.shippingFeePaisa,
      totalPaisa: o.totalPaisa,
      advanceRequiredPaisa: o.advanceRequiredPaisa,
      district: (o.address as { district?: string }).district ?? '',
      experimentKey: o.experimentKey,
      placedAt: o.createdAt.toISOString(),
    };
  }

  private items(items: Prisma.OrderItemGetPayload<object>[]) {
    return items.map((i) => ({
      sku: i.sku,
      nameBn: i.nameBn,
      nameEn: i.nameEn,
      options: i.options as Record<string, string>,
      qty: i.qty,
      unitPricePaisa: i.unitPricePaisa,
      lineTotalPaisa: i.lineTotalPaisa,
    }));
  }

  private totals(order: Order) {
    return {
      subtotalPaisa: order.subtotalPaisa,
      discountPaisa: order.discountPaisa,
      shippingFeePaisa: order.shippingFeePaisa,
      totalPaisa: order.totalPaisa,
      advanceRequiredPaisa: order.advanceRequiredPaisa,
    };
  }

  private async lock(tx: Tx, orderId: string): Promise<Order | null> {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
    return tx.order.findUnique({ where: { id: orderId } });
  }

  private async sweepSafely(): Promise<void> {
    try {
      const n = await this.cancelUnpaid();
      if (n > 0)
        this.logger.log(`Cancelled ${n} unpaid order(s) after ${this.config.ORDER_HOLD_HOURS}h`);
    } catch (err) {
      this.logger.error({ err }, 'Unpaid-order sweep failed');
    }
  }
}
