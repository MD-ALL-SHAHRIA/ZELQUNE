import { type INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../../apps/inventory-service/src/app.module';
import { PrismaService } from '../../apps/inventory-service/src/prisma/prisma.service';
import { InventoryService } from '../../apps/inventory-service/src/stock/inventory.service';
import { IT, SCHEMAS, serviceDbUrl } from './it-env';

describe('inventory-service on real Postgres', () => {
  let app: INestApplicationContext;
  let inventory: InventoryService;
  let db: PrismaService;
  const variant = randomUUID();

  beforeAll(async () => {
    Object.assign(process.env, {
      NODE_ENV: 'test', // no sweeper/relay timers; the test drives them
      LOG_LEVEL: 'silent',
      HTTP_PORT: '39201',
      TCP_PORT: '49201',
      DB_SCHEMA: SCHEMAS.inventory,
      DATABASE_URL: serviceDbUrl(SCHEMAS.inventory),
      RABBITMQ_URL: IT.rabbitUrl,
      RESERVATION_TTL_SECONDS: '900',
      ORDER_HOLD_HOURS: '48',
    });
    app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    inventory = app.get(InventoryService);
    db = app.get(PrismaService);
    await inventory.adjust({ variantId: variant, sku: 'IT-STOCK', delta: 3, reason: 'RECEIPT' });
  });

  afterAll(async () => {
    await app?.close();
  });

  const stock = () => db.inventoryItem.findUniqueOrThrow({ where: { variantId: variant } });

  it('never oversells under concurrent checkouts for the last units', async () => {
    const attempts = await Promise.allSettled(
      Array.from({ length: 6 }, () =>
        inventory.reserve({ orderId: randomUUID(), items: [{ variantId: variant, qty: 1 }] }),
      ),
    );
    expect(attempts.filter((a) => a.status === 'fulfilled')).toHaveLength(3);
    const rejected = attempts.filter((a): a is PromiseRejectedResult => a.status === 'rejected');
    expect(rejected.map((r) => (r.reason as { code: string }).code)).toEqual(
      Array(3).fill('OUT_OF_STOCK'),
    );
    expect(await stock()).toMatchObject({ onHand: 3, reserved: 3 });

    // release everything again
    const reservations = await db.stockReservation.findMany({
      where: { items: { some: { variantId: variant } } },
    });
    for (const r of reservations)
      await inventory.release({ orderId: r.orderId, reason: 'COMPENSATION' });
    expect(await stock()).toMatchObject({ onHand: 3, reserved: 0 });
  });

  it('reserve is idempotent per order; release is idempotent; released orders cannot re-reserve', async () => {
    const orderId = randomUUID();
    const first = await inventory.reserve({ orderId, items: [{ variantId: variant, qty: 2 }] });
    const again = await inventory.reserve({ orderId, items: [{ variantId: variant, qty: 2 }] });
    expect(again.reservationId).toBe(first.reservationId);
    expect((await stock()).reserved).toBe(2);

    expect(await inventory.release({ orderId, reason: 'COMPENSATION' })).toEqual({
      released: true,
    });
    expect(await inventory.release({ orderId, reason: 'COMPENSATION' })).toEqual({
      released: false,
    });
    expect(await inventory.release({ orderId: randomUUID(), reason: 'COMPENSATION' })).toEqual({
      released: false,
    });
    await expect(
      inventory.reserve({ orderId, items: [{ variantId: variant, qty: 1 }] }),
    ).rejects.toMatchObject({ code: 'RESERVATION_RELEASED' });
    expect((await stock()).reserved).toBe(0);
  });

  it('hold -> commit deducts stock once and writes a SALE movement', async () => {
    const orderId = randomUUID();
    await inventory.reserve({ orderId, items: [{ variantId: variant, qty: 1 }] });
    await db.$transaction((tx) => inventory.hold(orderId, tx));
    const held = await db.stockReservation.findUniqueOrThrow({ where: { orderId } });
    expect(held.status).toBe('HELD');
    expect(held.expiresAt.getTime()).toBeGreaterThan(Date.now() + 47 * 3_600_000);

    await db.$transaction((tx) => inventory.commit(orderId, tx));
    await db.$transaction((tx) => inventory.commit(orderId, tx)); // no double deduction
    expect(await stock()).toMatchObject({ onHand: 2, reserved: 0 });
    const sales = await db.stockMovement.findMany({ where: { refId: orderId } });
    expect(sales).toEqual([expect.objectContaining({ delta: -1, reason: 'SALE' })]);
    // a committed reservation can't be released
    expect(await inventory.release({ orderId, reason: 'ORDER_CANCELLED' })).toEqual({
      released: false,
    });
  });

  it('expired PENDING and HELD reservations are released by the sweeper', async () => {
    const pending = randomUUID();
    const held = randomUUID();
    await inventory.reserve({ orderId: pending, items: [{ variantId: variant, qty: 1 }] });
    await inventory.reserve({ orderId: held, items: [{ variantId: variant, qty: 1 }] });
    await db.$transaction((tx) => inventory.hold(held, tx));
    expect((await stock()).reserved).toBe(2);

    const released = await inventory.releaseExpired(new Date(Date.now() + 49 * 3_600_000));
    expect(released).toBeGreaterThanOrEqual(2);
    expect((await stock()).reserved).toBe(0);
    const rows = await db.stockReservation.findMany({
      where: { orderId: { in: [pending, held] } },
    });
    expect(rows.map((r) => [r.status, r.releaseReason])).toEqual([
      ['RELEASED', 'EXPIRED'],
      ['RELEASED', 'EXPIRED'],
    ]);
  });

  it('adjustments cannot drop on-hand below reserved', async () => {
    const orderId = randomUUID();
    await inventory.reserve({ orderId, items: [{ variantId: variant, qty: 2 }] });
    await expect(
      inventory.adjust({ variantId: variant, sku: 'IT-STOCK', delta: -1, reason: 'ADJUSTMENT' }),
    ).rejects.toMatchObject({ code: 'STOCK_BELOW_RESERVED' });
    await inventory.release({ orderId, reason: 'COMPENSATION' });
  });

  it('every change wrote its event to the outbox', async () => {
    const types = await db.outboxEvent.groupBy({ by: ['type'], _count: true });
    expect(Object.fromEntries(types.map((t) => [t.type, t._count]))).toMatchObject({
      'stock.reserved': expect.any(Number),
      'stock.released': expect.any(Number),
    });
  });
});
