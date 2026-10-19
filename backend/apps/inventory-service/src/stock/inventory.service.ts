import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { APP_CONFIG, AppError, OutboxService, recordAudit, requestContext } from '@zelqune/common';
import {
  adjustStockInputSchema,
  type AdjustStockInput,
  releaseStockRequestSchema,
  type ReleaseStockRequest,
  type ReservationView,
  reserveStockRequestSchema,
  type ReserveStockRequest,
  type StockLevels,
  type StockLevelView,
  stockReleased,
  stockReserved,
} from '@zelqune/contracts';
import { type InventoryEnv } from '../config/inventory-env';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { canTransitionReservation, findShortages, mergeLines, type StockRow } from './stock-rules';

type Tx = Prisma.TransactionClient;
const SOURCE = 'inventory-service';
const SWEEP_BATCH = 100;

type ReservationWithItems = Prisma.StockReservationGetPayload<{ include: { items: true } }>;

function toView(r: ReservationWithItems): ReservationView {
  return {
    reservationId: r.id,
    orderId: r.orderId,
    status: r.status,
    expiresAt: r.expiresAt.toISOString(),
    items: r.items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
  };
}

/**
 * Stock reservations for checkout. All changes lock the affected inventory rows in variant-id
 * order (FOR UPDATE), so concurrent checkouts can never oversell or deadlock.
 */
@Injectable()
export class InventoryService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(InventoryService.name);
  private sweepTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    @Inject(APP_CONFIG) private readonly config: InventoryEnv,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.NODE_ENV === 'test') return;
    this.sweepTimer = setInterval(
      () => void this.sweepSafely(),
      this.config.RESERVATION_SWEEP_INTERVAL_MS,
    );
  }

  onModuleDestroy(): void {
    clearInterval(this.sweepTimer);
  }

  /** Idempotent per order: a second call returns the existing reservation. */
  async reserve(raw: ReserveStockRequest): Promise<ReservationView> {
    const { orderId, items } = reserveStockRequestSchema.parse(raw);
    const lines = mergeLines(items);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.stockReservation.findUnique({
        where: { orderId },
        include: { items: true },
      });
      if (existing) {
        if (existing.status === 'RELEASED') {
          throw new AppError(
            'RESERVATION_RELEASED',
            'Reservation for this order was already released',
            409,
          );
        }
        return toView(existing);
      }

      const rows = await this.lockRows(
        tx,
        lines.map((l) => l.variantId),
      );
      const shortages = findShortages(rows, lines);
      if (shortages.length > 0) {
        throw new AppError('OUT_OF_STOCK', 'Not enough stock for some items', 409, { shortages });
      }
      for (const { variantId, qty } of lines) {
        await tx.inventoryItem.update({
          where: { variantId },
          data: { reserved: { increment: qty } },
        });
      }
      const reservation = await tx.stockReservation.create({
        data: {
          orderId,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + this.config.RESERVATION_TTL_SECONDS * 1000),
          items: { create: lines },
        },
        include: { items: true },
      });
      await this.outbox.add(
        tx,
        stockReserved.create(
          {
            reservationId: reservation.id,
            orderId,
            items: lines,
            expiresAt: reservation.expiresAt.toISOString(),
          },
          { source: SOURCE, requestId: requestContext.requestId() },
        ),
      );
      return toView(reservation);
    });
  }

  /** Idempotent: unknown orders (e.g. pre-orders) and already-final reservations are no-ops. */
  async release(raw: ReleaseStockRequest, tx?: Tx): Promise<{ released: boolean }> {
    const { orderId, reason } = releaseStockRequestSchema.parse(raw);
    return this.inTx(tx, async (t) => {
      const reservation = await this.lockReservation(t, orderId);
      if (!reservation || !canTransitionReservation(reservation.status, 'RELEASED'))
        return { released: false };
      await this.lockRows(
        t,
        reservation.items.map((i) => i.variantId),
      );
      for (const { variantId, qty } of reservation.items) {
        await t.inventoryItem.update({
          where: { variantId },
          data: { reserved: { decrement: qty } },
        });
      }
      await t.stockReservation.update({
        where: { id: reservation.id },
        data: { status: 'RELEASED', releaseReason: reason },
      });
      await this.outbox.add(
        t,
        stockReleased.create(
          {
            reservationId: reservation.id,
            orderId,
            items: reservation.items.map(({ variantId, qty }) => ({ variantId, qty })),
            reason,
          },
          { source: SOURCE, requestId: requestContext.requestId() },
        ),
      );
      return { released: true };
    });
  }

  /** order.placed: keep the stock until the order is confirmed or ORDER_HOLD_HOURS pass. */
  async hold(orderId: string, tx: Tx): Promise<void> {
    const reservation = await this.lockReservation(tx, orderId);
    if (!reservation || !canTransitionReservation(reservation.status, 'HELD')) return;
    await tx.stockReservation.update({
      where: { id: reservation.id },
      data: {
        status: 'HELD',
        expiresAt: new Date(Date.now() + this.config.ORDER_HOLD_HOURS * 3_600_000),
      },
    });
  }

  /** order.confirmed: deduct the reserved stock for good and record SALE movements. */
  async commit(orderId: string, tx: Tx): Promise<void> {
    const reservation = await this.lockReservation(tx, orderId);
    if (!reservation || !canTransitionReservation(reservation.status, 'COMMITTED')) return;
    await this.lockRows(
      tx,
      reservation.items.map((i) => i.variantId),
    );
    for (const { variantId, qty } of reservation.items) {
      await tx.inventoryItem.update({
        where: { variantId },
        data: { onHand: { decrement: qty }, reserved: { decrement: qty } },
      });
      await tx.stockMovement.create({
        data: { variantId, delta: -qty, reason: 'SALE', refId: orderId },
      });
    }
    await tx.stockReservation.update({
      where: { id: reservation.id },
      data: { status: 'COMMITTED' },
    });
  }

  /** Releases expired PENDING/HELD reservations. Safe with several replicas (SKIP LOCKED). */
  async releaseExpired(now = new Date()): Promise<number> {
    const due = await this.prisma.$queryRaw<{ order_id: string }[]>`
      SELECT order_id FROM stock_reservations
      WHERE status IN ('PENDING', 'HELD') AND expires_at <= ${now}
      ORDER BY expires_at LIMIT ${SWEEP_BATCH}`;
    let released = 0;
    for (const { order_id } of due) {
      const result = await this.release({ orderId: order_id, reason: 'EXPIRED' });
      if (result.released) released++;
    }
    return released;
  }

  /** Admin view: all stock rows (or the given variants). */
  async list(variantIds?: string[]): Promise<StockLevelView[]> {
    const rows = await this.prisma.inventoryItem.findMany({
      where: variantIds?.length ? { variantId: { in: variantIds } } : {},
      orderBy: { sku: 'asc' },
      take: 500,
    });
    return rows.map((r) => ({
      variantId: r.variantId,
      sku: r.sku,
      onHand: r.onHand,
      reserved: r.reserved,
      available: r.onHand - r.reserved,
      updatedAt: r.updatedAt.toISOString(),
    }));
  }

  async levels(variantIds: string[]): Promise<StockLevels> {
    const rows = await this.prisma.inventoryItem.findMany({
      where: { variantId: { in: variantIds } },
    });
    return Object.fromEntries(rows.map((r) => [r.variantId, r.onHand - r.reserved]));
  }

  /** Admin stock change (receipt, correction, return). Can never drop below reserved. */
  async adjust(raw: AdjustStockInput): Promise<{ onHand: number; reserved: number }> {
    const input = adjustStockInputSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.upsert({
        where: { variantId: input.variantId },
        create: { variantId: input.variantId, sku: input.sku },
        update: {},
      });
      const [row] = await this.lockRows(tx, [input.variantId]);
      const onHand = row.onHand + input.delta;
      if (onHand < row.reserved) {
        throw new AppError(
          'STOCK_BELOW_RESERVED',
          `On-hand cannot go below reserved (${row.reserved})`,
          409,
        );
      }
      const item = await tx.inventoryItem.update({
        where: { variantId: input.variantId },
        data: { onHand, sku: input.sku },
      });
      await tx.stockMovement.create({
        data: {
          variantId: input.variantId,
          delta: input.delta,
          reason: input.reason,
          note: input.note,
        },
      });
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'stock.adjust',
        entityType: 'variant',
        entityId: input.variantId,
        summary: `${input.sku}: ${input.delta > 0 ? '+' : ''}${input.delta} (${input.reason}) -> on hand ${item.onHand}`,
        changes: {
          delta: input.delta,
          reason: input.reason,
          note: input.note,
          onHand: item.onHand,
        },
      });
      return { onHand: item.onHand, reserved: item.reserved };
    });
  }

  private async sweepSafely(): Promise<void> {
    try {
      const n = await this.releaseExpired();
      if (n > 0) this.logger.log(`Released ${n} expired reservation(s)`);
    } catch (err) {
      this.logger.error({ err }, 'Reservation sweep failed');
    }
  }

  private async lockRows(tx: Tx, variantIds: string[]): Promise<StockRow[]> {
    if (variantIds.length === 0) return [];
    const ids = [...variantIds].sort();
    return tx.$queryRaw<StockRow[]>`
      SELECT variant_id AS "variantId", on_hand AS "onHand", reserved
      FROM inventory_items WHERE variant_id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})
      ORDER BY variant_id FOR UPDATE`;
  }

  private async lockReservation(tx: Tx, orderId: string): Promise<ReservationWithItems | null> {
    await tx.$queryRaw`SELECT id FROM stock_reservations WHERE order_id = ${orderId}::uuid FOR UPDATE`;
    return tx.stockReservation.findUnique({ where: { orderId }, include: { items: true } });
  }

  private inTx<T>(tx: Tx | undefined, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return tx ? fn(tx) : this.prisma.$transaction(fn);
  }
}
