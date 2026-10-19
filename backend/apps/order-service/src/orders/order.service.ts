import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { APP_CONFIG, AppError, OutboxService, requestContext } from '@zelqune/common';
import {
  orderCancelled,
  orderConfirmed,
  type OrderStatus,
  type OrderTrackingCore,
  transitionOrderInputSchema,
  type TransitionOrderInput,
  type TrackQuery,
} from '@zelqune/contracts';
import { type OrderEnv } from '../config/order-env';
import { canTransitionOrder } from '../domain/order-state';
import { type Order, type Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;
type CancelReason = 'PAYMENT_TIMEOUT' | 'STOCK_HOLD_EXPIRED' | 'ADMIN' | 'CUSTOMER';
const SOURCE = 'order-service';
const SWEEP_BATCH = 100;

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
      items: order.items.map((i) => ({
        sku: i.sku,
        nameBn: i.nameBn,
        nameEn: i.nameEn,
        options: i.options as Record<string, string>,
        qty: i.qty,
        unitPricePaisa: i.unitPricePaisa,
        lineTotalPaisa: i.lineTotalPaisa,
      })),
      totals: {
        subtotalPaisa: order.subtotalPaisa,
        discountPaisa: order.discountPaisa,
        shippingFeePaisa: order.shippingFeePaisa,
        totalPaisa: order.totalPaisa,
        advanceRequiredPaisa: order.advanceRequiredPaisa,
      },
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

  /** Admin status change (HTTP route in step 1.3). */
  async transition(raw: TransitionOrderInput): Promise<{ status: OrderStatus }> {
    const input = transitionOrderInputSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      const order = await this.lock(tx, input.orderId);
      if (!order) throw new AppError('ORDER_NOT_FOUND', 'Order not found', 404);
      await this.apply(
        tx,
        order,
        input.to,
        input.actor,
        input.reason ?? (input.to === 'CANCELLED' ? 'ADMIN' : null),
      );
      return { status: input.to };
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
