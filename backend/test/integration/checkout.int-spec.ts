import { type INestApplication } from '@nestjs/common';
import { ORDER_CODE_PATTERN } from '@zelqune/contracts';
import { type Channel, type ChannelModel, connect } from 'amqplib';
import { Redis } from 'ioredis';
import request from 'supertest';
import { CatalogAdminService } from '../../apps/catalog-service/src/admin/catalog-admin.service';
import { PrismaService as CatalogDb } from '../../apps/catalog-service/src/prisma/prisma.service';
import { seedCatalog } from '../../apps/catalog-service/src/seed/catalog.seed';
import { PrismaService as InventoryDb } from '../../apps/inventory-service/src/prisma/prisma.service';
import { InventoryService } from '../../apps/inventory-service/src/stock/inventory.service';
import { OrderService } from '../../apps/order-service/src/orders/order.service';
import { PrismaService as OrderDb } from '../../apps/order-service/src/prisma/prisma.service';
import { PaymentService } from '../../apps/payment-service/src/payments/payment.service';
import { PrismaService as PaymentDb } from '../../apps/payment-service/src/prisma/prisma.service';
import { prepareDatabase } from './database';
import { IT } from './it-env';
import { type Stack, startStack, TEST_BKASH_NUMBER } from './stack';

const ADMIN = '9d1f6c2e-3b4a-4c5d-8e7f-6a5b4c3d2e1f';
const CUSTOMER = { name: 'Rahim Uddin', phone: '01712345678' };
const DHAKA = { district: 'dhaka', area: 'Mirpur', line: 'House 12, Road 3, Mirpur 10' };

async function eventually<T>(fn: () => Promise<T>, ok: (v: T) => boolean, ms = 10_000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (ok(v) || Date.now() > end) return v;
    await new Promise((r) => setTimeout(r, 150));
  }
}

describe('checkout end-to-end through the gateway on real infrastructure', () => {
  let stack: Stack;
  let gw: INestApplication;
  let redis: Redis;
  let amqp: ChannelModel;
  let channel: Channel;
  const seen: string[] = [];
  let aloWalnut: string;
  let lamp: string;
  let keySeq = 0;
  let ipSeq = 0;

  const svc = <T>(
    app: INestApplication | undefined,
    token: abstract new (...args: never[]) => T,
  ): T => {
    if (!app) throw new Error('service not started');
    return app.get(token);
  };

  beforeAll(async () => {
    const database = await prepareDatabase('zelqune_it_checkout', [
      'catalog',
      'inventory',
      'orders',
      'payments',
      'shipping',
    ]);
    redis = new Redis(IT.redisUrl);
    await redis.flushdb();
    amqp = await connect(IT.rabbitUrl);
    channel = await amqp.createChannel();
    await channel.assertExchange('zelqune.events', 'topic', { durable: true });
    const { queue } = await channel.assertQueue('', { exclusive: true });
    await channel.bindQueue(queue, 'zelqune.events', '#');
    await channel.consume(
      queue,
      (m) => m && seen.push(JSON.parse(m.content.toString()).type as string),
      { noAck: true },
    );

    stack = await startStack({
      database,
      services: ['catalog', 'inventory', 'payment', 'shipping', 'order'],
    });
    gw = stack.gateway;

    await seedCatalog(stack.catalog!);
    const catalogDb = svc(stack.catalog, CatalogDb);
    aloWalnut = (
      await catalogDb.productVariant.findUniqueOrThrow({ where: { sku: 'ALO-ARCH-WALNUT' } })
    ).id;

    // An IN_STOCK product with 2 units.
    const admin = svc(stack.catalog, CatalogAdminService);
    const p = await admin.createProduct({
      slug: 'desk-lamp',
      nameBn: 'ডেস্ক ল্যাম্প',
      nameEn: 'Desk Lamp',
      saleMode: 'IN_STOCK',
    });
    lamp = (
      await admin.upsertVariant({
        productId: p.id,
        sku: 'DESK-LAMP-1',
        packageWeightGrams: 800,
        packageLengthMm: 300,
        packageWidthMm: 200,
        packageHeightMm: 150,
      })
    ).id;
    await admin.setBasePrice({ variantId: lamp, amountPaisa: 150000 });
    await admin.publishProduct({ productId: p.id });
    await svc(stack.inventory, InventoryService).adjust({
      variantId: lamp,
      sku: 'DESK-LAMP-1',
      delta: 2,
      reason: 'RECEIPT',
    });
  });

  afterAll(async () => {
    await stack?.close();
    await channel?.close();
    await amqp?.close();
    await redis?.quit();
  });

  const http = () => request(gw.getHttpServer());
  const newCart = async (p?: string): Promise<string> => {
    const res = await http()
      .post('/v1/carts')
      .send(p ? { p } : {})
      .expect(201);
    return res.body.cartToken as string;
  };
  const add = (token: string, variantId: string, qty = 1) =>
    http().put(`/v1/carts/current/items/${variantId}`).set('x-cart-token', token).send({ qty });
  const checkout = (token: string, body: object, key = `checkout-${++keySeq}-key`) =>
    http()
      .post('/v1/checkout')
      .set('x-forwarded-for', `198.19.0.${++ipSeq}`)
      .set('x-cart-token', token)
      .set('idempotency-key', key)
      .set('cf-turnstile-response', 'dev-pass')
      .send({ customer: CUSTOMER, address: DHAKA, ...body });
  const stock = () =>
    svc(stack.inventory, InventoryDb).inventoryItem.findUniqueOrThrow({
      where: { variantId: lamp },
    });
  const track = (code: string, phone = CUSTOMER.phone) =>
    http().post('/v1/orders/track').send({ code: code, phone: phone });

  let preOrderCode = '';
  let preOrderPaymentId = '';
  let codOrderCode = '';

  it('PRE_ORDER: quote shows the price experiment, volumetric shipping and the ৳300 advance', async () => {
    const token = await newCart('b');
    const cart = await add(token, aloWalnut).expect(200);
    expect(cart.body).toMatchObject({
      saleMode: 'PRE_ORDER',
      subtotalPaisa: 429000,
      experimentKey: 'b',
    });

    const quote = await http()
      .post('/v1/carts/current/quote')
      .set('x-cart-token', token)
      .send({ district: 'dhaka', area: 'Mirpur' })
      .expect(200);
    expect(quote.body).toMatchObject({
      saleMode: 'PRE_ORDER',
      subtotalPaisa: 429000,
      shippingFeePaisa: 17000, // 2.5 kg actual vs 5.6 kg volumetric -> 6 kg -> ৳70 + 5 x ৳20
      totalPaisa: 446000,
      advanceRequiredPaisa: 30000,
      zone: 'DHAKA',
      chargeableWeightGrams: 6000,
      allowedPaymentMethods: ['BKASH_MANUAL'],
      paymentInstructions: {
        bkash: { number: TEST_BKASH_NUMBER, accountType: 'personal' },
        nagad: null,
      },
    });

    // COD is refused for pre-orders
    expect((await checkout(token, { paymentMethod: 'COD' }).expect(422)).body.error.code).toBe(
      'ADVANCE_REQUIRED',
    );

    // bKash advance with a trxId -> order placed; same Idempotency-Key replays exactly
    const key = 'preorder-checkout-1';
    const placed = await checkout(
      token,
      { paymentMethod: 'BKASH_MANUAL', trxId: '9AB7CD5EF3' },
      key,
    ).expect(201);
    expect(placed.body).toMatchObject({
      status: 'PENDING_PAYMENT',
      saleMode: 'PRE_ORDER',
      totals: { totalPaisa: 446000, advanceRequiredPaisa: 30000 },
      payment: {
        method: 'BKASH_MANUAL',
        kind: 'ADVANCE',
        status: 'SUBMITTED',
        amountPaisa: 30000,
        trxIdLast4: '5EF3',
      },
    });
    expect(placed.body.orderCode).toMatch(ORDER_CODE_PATTERN);
    const replay = await checkout(
      token,
      { paymentMethod: 'BKASH_MANUAL', trxId: '9AB7CD5EF3' },
      key,
    ).expect(201);
    expect(replay.body).toEqual(placed.body);
    expect(replay.headers['idempotency-replayed']).toBe('true');
    preOrderCode = placed.body.orderCode as string;
    preOrderPaymentId = placed.body.payment.id as string;

    // the cart is now checked out; pre-orders reserve no stock
    expect(
      (await http().get('/v1/carts/current').set('x-cart-token', token).expect(409)).body.error,
    ).toMatchObject({
      code: 'CART_CHECKED_OUT',
      details: { orderCode: preOrderCode },
    });
    expect(await svc(stack.inventory, InventoryDb).stockReservation.count()).toBe(0);
  });

  it('tracking works with code + phone only', async () => {
    const res = await track(preOrderCode.toLowerCase(), '+880 1712-345678').expect(200);
    expect(res.body).toMatchObject({
      code: preOrderCode,
      status: 'PENDING_PAYMENT',
      payment: { status: 'SUBMITTED' },
      shipment: null,
    });
    expect(res.body.items).toEqual([
      expect.objectContaining({ sku: 'ALO-ARCH-WALNUT', qty: 1, unitPricePaisa: 429000 }),
    ]);
    expect((await track(preOrderCode, '01812345678').expect(404)).body.error.code).toBe(
      'ORDER_NOT_FOUND',
    );
  });

  it('verifying the advance confirms the order through events', async () => {
    await svc(stack.payment, PaymentService).verify({
      paymentId: preOrderPaymentId,
      verifiedBy: ADMIN,
      amountReceivedPaisa: 30000,
    });
    const res = await eventually(
      () => track(preOrderCode),
      (r) => r.body.status === 'CONFIRMED',
    );
    expect(res.body).toMatchObject({ status: 'CONFIRMED', payment: { status: 'VERIFIED' } });
    expect(res.body.history.map((h: { status: string }) => h.status)).toEqual([
      'PENDING_PAYMENT',
      'CONFIRMED',
    ]);
  });

  it('IN_STOCK + COD reserves stock; confirming COD commits it (SALE movement)', async () => {
    const token = await newCart();
    await add(token, lamp).expect(200);
    const placed = await checkout(token, { paymentMethod: 'COD' }).expect(201);
    expect(placed.body).toMatchObject({
      saleMode: 'IN_STOCK',
      totals: { subtotalPaisa: 150000, advanceRequiredPaisa: 0 },
      payment: { kind: 'COD', status: 'COD_PENDING' },
    });
    codOrderCode = placed.body.orderCode as string;
    expect(await stock()).toMatchObject({ onHand: 2, reserved: 1 });
    // order.placed moves the reservation to HELD
    const held = await eventually(
      () => svc(stack.inventory, InventoryDb).stockReservation.findFirstOrThrow(),
      (r) => r.status === 'HELD',
    );
    expect(held.status).toBe('HELD');

    await svc(stack.payment, PaymentService).confirmCod({
      paymentId: placed.body.payment.id as string,
      confirmedBy: ADMIN,
    });
    await eventually(
      () => stock(),
      (s) => s.onHand === 1,
    );
    expect(await stock()).toMatchObject({ onHand: 1, reserved: 0 });
    expect((await track(codOrderCode).expect(200)).body.status).toBe('CONFIRMED');
    const sales = await svc(stack.inventory, InventoryDb).stockMovement.findMany({
      where: { reason: 'SALE' },
    });
    expect(sales).toEqual([expect.objectContaining({ variantId: lamp, delta: -1 })]);
  });

  it('a duplicate trxId fails the payment step and the saga releases the reserved stock', async () => {
    const token = await newCart();
    await add(token, lamp).expect(200);
    const dup = await checkout(token, {
      paymentMethod: 'BKASH_MANUAL',
      trxId: '9AB7CD5EF3',
    }).expect(409);
    expect(dup.body.error.code).toBe('TRX_ID_ALREADY_USED');
    expect(await stock()).toMatchObject({ onHand: 1, reserved: 0 });
    const sagas = await svc(stack.order, OrderDb).checkoutSaga.findMany({
      where: { status: 'COMPENSATED' },
    });
    expect(sagas).toHaveLength(1);
    // the cart is still usable: retry with a fresh trxId
    const retry = await checkout(token, {
      paymentMethod: 'BKASH_MANUAL',
      trxId: 'NEW7TRX888',
    }).expect(201);
    expect(retry.body.payment).toMatchObject({
      kind: 'FULL',
      amountPaisa: retry.body.totals.totalPaisa,
    });
    expect(await stock()).toMatchObject({ onHand: 1, reserved: 1 });
  });

  it('out of stock -> 409 with shortages, no order', async () => {
    const before = await svc(stack.order, OrderDb).order.count();
    const token = await newCart();
    await add(token, lamp).expect(200);
    const res = await checkout(token, { paymentMethod: 'COD' }).expect(409);
    expect(res.body.error).toMatchObject({
      code: 'OUT_OF_STOCK',
      details: { shortages: [{ variantId: lamp, requested: 1, available: 0 }] },
    });
    expect(await svc(stack.order, OrderDb).order.count()).toBe(before);
  });

  it('one sale mode per order', async () => {
    const token = await newCart();
    await add(token, lamp).expect(200);
    await add(token, aloWalnut).expect(200);
    const res = await http()
      .post('/v1/carts/current/quote')
      .set('x-cart-token', token)
      .send({ district: 'sylhet', area: 'Zindabazar' })
      .expect(422);
    expect(res.body.error.code).toBe('MIXED_SALE_MODES');
  });

  it('unpaid orders are cancelled after ORDER_HOLD_HOURS: stock released, payment voided', async () => {
    // an unverified PRE_ORDER (no stock reservation) must be cancelled too
    const token = await newCart('a');
    await add(token, aloWalnut).expect(200);
    const unpaidPreOrder = await checkout(token, {
      paymentMethod: 'BKASH_MANUAL',
      trxId: 'PREORD2222',
    }).expect(201);

    const orders = svc(stack.order, OrderService);
    const cancelled = await orders.cancelUnpaid(new Date(Date.now() + 49 * 3_600_000));
    expect(cancelled).toBe(2); // the unverified bKash FULL order and the unpaid pre-order
    const preOrderTrack = await track(unpaidPreOrder.body.orderCode as string).expect(200);
    expect(preOrderTrack.body.status).toBe('CANCELLED');
    await eventually(
      () => stock(),
      (s) => s.reserved === 0,
    );
    expect(await stock()).toMatchObject({ onHand: 1, reserved: 0 });
    const voided = await eventually(
      () =>
        svc(stack.payment, PaymentDb).payment.findFirst({
          where: { trxId: null, voidedTrxId: 'NEW7TRX888' },
        }),
      (p) => p?.status === 'VOID',
    );
    expect(voided?.voidReason).toBe('ORDER_CANCELLED:PAYMENT_TIMEOUT');
    expect((await track(preOrderCode).expect(200)).body.status).toBe('CONFIRMED');
  });

  it('checkout needs Turnstile', async () => {
    const token = await newCart();
    const res = await http()
      .post('/v1/checkout')
      .set('x-cart-token', token)
      .set('idempotency-key', 'turnstile-check-1')
      .set('cf-turnstile-response', 'fail-bot')
      .send({ customer: CUSTOMER, address: DHAKA, paymentMethod: 'COD' })
      .expect(403);
    expect(res.body.error.code).toBe('TURNSTILE_FAILED');
  });

  it('every saga and lifecycle event reached RabbitMQ', async () => {
    const expected = [
      'order.placed',
      'stock.reserved',
      'stock.released',
      'payment.submitted',
      'payment.verified',
      'order.confirmed',
      'order.cancelled',
    ];
    await eventually(
      () => Promise.resolve(seen),
      (s) => expected.every((t) => s.includes(t)),
    );
    expect(expected.filter((t) => !seen.includes(t))).toEqual([]);
  });
});
