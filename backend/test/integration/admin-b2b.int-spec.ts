import { type INestApplication } from '@nestjs/common';
import { type DashboardStats } from '@zelqune/contracts';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaService as CatalogDb } from '../../apps/catalog-service/src/prisma/prisma.service';
import { seedCatalog } from '../../apps/catalog-service/src/seed/catalog.seed';
import { PasswordService } from '../../apps/identity-service/src/auth/password.service';
import { seedOwner } from '../../apps/identity-service/src/seed/owner.seed';
import { UserRepository } from '../../apps/identity-service/src/users/user.repository';
import { PrismaService as NotificationDb } from '../../apps/notification-service/src/prisma/prisma.service';
import { QuoteService } from '../../apps/order-service/src/quotes/quote.service';
import { prepareDatabase } from './database';
import { IT } from './it-env';
import { OWNER, type Stack, startStack } from './stack';

const STAFF = { phone: '01811111111', password: 'integration-staff-pass' };
const CUSTOMER = { name: 'Karim Ahmed', phone: '01722222222' };
const DHAKA = { district: 'dhaka', area: 'Dhanmondi', line: 'House 5, Road 7, Dhanmondi' };

async function expectStatus(
  res: Promise<request.Response>,
  status: number,
): Promise<request.Response> {
  const r = await res;
  if (r.status !== status)
    throw new Error(`expected ${status}, got ${r.status}: ${JSON.stringify(r.body)}`);
  return r;
}

async function eventually<T>(fn: () => Promise<T>, ok: (v: T) => boolean, ms = 12_000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (ok(v) || Date.now() > end) return v;
    await new Promise((r) => setTimeout(r, 200));
  }
}

describe('admin, analytics, notifications and B2B through the gateway on real infrastructure', () => {
  let stack: Stack;
  let gw: INestApplication;
  let redis: Redis;
  let ownerToken = '';
  let staffToken = '';
  let staffId = '';
  let ip = 0;
  let key = 0;
  const http = () => request(gw.getHttpServer());
  const as = (token: string) => ({
    get: (p: string) => http().get(p).set('Authorization', `Bearer ${token}`),
    post: (p: string) => http().post(p).set('Authorization', `Bearer ${token}`),
    put: (p: string) => http().put(p).set('Authorization', `Bearer ${token}`),
    patch: (p: string) => http().patch(p).set('Authorization', `Bearer ${token}`),
  });
  const svc = <T>(
    app: INestApplication | undefined,
    token: abstract new (...a: never[]) => T,
  ): T => {
    if (!app) throw new Error('service not started');
    return app.get(token);
  };

  beforeAll(async () => {
    const database = await prepareDatabase('zelqune_it_admin');
    redis = new Redis(IT.redisUrl);
    await redis.flushdb();
    stack = await startStack({
      database,
      services: [
        'identity',
        'catalog',
        'inventory',
        'payment',
        'shipping',
        'notification',
        'analytics',
        'order',
      ],
      gatewayEnv: { LOGIN_MAX_PER_IP: '100' },
    });
    gw = stack.gateway;
    await seedOwner(stack.identity!);
    const passwords = svc(stack.identity, PasswordService);
    const staff = await svc(stack.identity, UserRepository).upsertAdmin({
      phone: '+8801811111111',
      name: 'IT Staff',
      role: 'STAFF',
      passwordHash: await passwords.hash(STAFF.password),
    });
    staffId = staff.id;
    await seedCatalog(stack.catalog!);
    const login = async (phone: string, password: string) =>
      (
        await http()
          .post('/v1/admin/auth/login')
          .set('x-forwarded-for', `198.20.0.${++ip}`)
          .send({ phone, password })
          .expect(200)
      ).body.accessToken as string;
    ownerToken = await login(OWNER.phone, OWNER.password);
    staffToken = await login(STAFF.phone, STAFF.password);
  });

  afterAll(async () => {
    await stack?.close();
    await redis?.quit();
  });

  const dashboard = () =>
    as(staffToken)
      .get('/v1/admin/dashboard')
      .expect(200)
      .then((r) => r.body as DashboardStats);
  const checkout = async (
    variantId: string,
    body: object,
    opts: { p?: string; sessionId?: string; qty?: number } = {},
  ) => {
    const token = (
      await http()
        .post('/v1/carts')
        .send(opts.p ? { p: opts.p } : {})
        .expect(201)
    ).body.cartToken as string;
    await http()
      .put(`/v1/carts/current/items/${variantId}`)
      .set('x-cart-token', token)
      .send({ qty: opts.qty ?? 1 })
      .expect(200);
    return http()
      .post('/v1/checkout')
      .set('x-forwarded-for', `198.21.0.${++ip}`)
      .set('x-cart-token', token)
      .set('idempotency-key', `admin-it-checkout-${++key}`)
      .set('cf-turnstile-response', 'dev-pass')
      .send({
        customer: CUSTOMER,
        address: DHAKA,
        ...(opts.sessionId ? { sessionId: opts.sessionId } : {}),
        ...body,
      });
  };

  let aloWalnut = '';
  let lampVariant = '';
  let preOrder = { id: '', code: '', paymentId: '' };
  let codOrder = { id: '', code: '', paymentId: '' };

  it('catalog management over HTTP (audited): product, variant, price, stock, media', async () => {
    aloWalnut = (
      await svc(stack.catalog, CatalogDb).productVariant.findUniqueOrThrow({
        where: { sku: 'ALO-ARCH-WALNUT' },
      })
    ).id;
    const product = await as(staffToken)
      .post('/v1/admin/products')
      .send({
        slug: 'table-lamp',
        nameBn: 'টেবিল ল্যাম্প',
        nameEn: 'Table Lamp',
        saleMode: 'IN_STOCK',
      })
      .expect(201);
    const productId = product.body.id as string;
    lampVariant = (
      await as(staffToken)
        .put(`/v1/admin/products/${productId}/variants/TABLE-LAMP-1`)
        .send({ packageWeightGrams: 900 })
        .expect(200)
    ).body.id as string;
    await as(staffToken)
      .put(`/v1/admin/variants/${lampVariant}/price`)
      .send({ amountPaisa: 180000 })
      .expect(200);
    await as(staffToken).post(`/v1/admin/products/${productId}/publish`).expect(200);
    await as(staffToken)
      .post(`/v1/admin/stock/${lampVariant}/adjustments`)
      .send({ sku: 'TABLE-LAMP-1', delta: 5, reason: 'RECEIPT' })
      .expect(201);
    const stock = await as(staffToken).get(`/v1/admin/stock?variantIds=${lampVariant}`).expect(200);
    expect(stock.body.items).toEqual([
      expect.objectContaining({ onHand: 5, reserved: 0, available: 5 }),
    ]);

    // media upload through the presigned (local) flow
    const ticket = await as(staffToken)
      .post(`/v1/admin/products/${productId}/media/uploads`)
      .send({ mimeType: 'image/webp', bytes: 12, altEn: 'Lamp' })
      .expect(201);
    const url = new URL(ticket.body.uploadUrl as string);
    await request(stack.catalog!.getHttpServer())
      .put(`${url.pathname}${url.search}`)
      .set('Content-Type', 'image/webp')
      .send(Buffer.alloc(12, 7))
      .expect(200);
    await as(staffToken).post(`/v1/admin/media/${ticket.body.mediaId}/confirm`).expect(200);
    const detail = await as(staffToken).get(`/v1/admin/products/${productId}`).expect(200);
    expect(detail.body).toMatchObject({
      status: 'ACTIVE',
      variants: [
        expect.objectContaining({
          sku: 'TABLE-LAMP-1',
          basePrice: { amountPaisa: 180000, compareAtPaisa: null },
        }),
      ],
      media: [expect.objectContaining({ status: 'READY' })],
    });
    const list = await as(staffToken).get('/v1/admin/products?q=lamp').expect(200);
    expect(list.body.items.map((p: { slug: string }) => p.slug)).toContain('table-lamp');
  });

  it('storefront orders + beacons; STAFF verifies the advance over HTTP -> CONFIRMED -> GO 1', async () => {
    for (const [sessionId, p] of [
      ['sess-adminit-aaaaaaaa', 'b'],
      ['sess-adminit-bbbbbbbb', 'b'],
      ['sess-adminit-cccccccc', 'a'],
    ] as const) {
      await http().post('/v1/events').send({ type: 'VIEW', sessionId, p }).expect(204);
    }
    await http()
      .post('/v1/events')
      .send({ type: 'ADD_TO_CART', sessionId: 'sess-adminit-aaaaaaaa', p: 'b' })
      .expect(204);

    const placed = await expectStatus(
      checkout(
        aloWalnut,
        { paymentMethod: 'BKASH_MANUAL', trxId: 'ADMIN1TRX9' },
        { p: 'b', sessionId: 'sess-adminit-aaaaaaaa' },
      ),
      201,
    );
    preOrder = {
      id: '',
      code: placed.body.orderCode as string,
      paymentId: placed.body.payment.id as string,
    };

    const list = await as(staffToken).get(`/v1/admin/orders?q=${preOrder.code}`).expect(200);
    expect(list.body.items).toEqual([
      expect.objectContaining({
        code: preOrder.code,
        status: 'PENDING_PAYMENT',
        channel: 'B2C',
        isFriend: false,
        advanceRequiredPaisa: 30000,
      }),
    ]);
    preOrder.id = list.body.items[0].id as string;

    await as(staffToken)
      .post(`/v1/admin/payments/${preOrder.paymentId}/verify`)
      .send({ amountReceivedPaisa: 30000 })
      .expect(200);
    const detail = await eventually(
      () => as(staffToken).get(`/v1/admin/orders/${preOrder.id}`),
      (r) => r.body.status === 'CONFIRMED',
    );
    expect(detail.body).toMatchObject({
      status: 'CONFIRMED',
      payment: { status: 'VERIFIED' },
      items: [expect.objectContaining({ unitPricePaisa: 429000 })],
    });

    const d = await eventually(dashboard, (b) => b.go.count === 1);
    expect(d.go).toEqual({ count: 1, target: 10, reached: false });
    expect(d.funnel).toMatchObject({ views: 3, addToCart: 1, checkout: 1, purchase: 1 });
    expect(d.experiments.find((e: { key: string }) => e.key === 'b')).toMatchObject({
      sessions: 2,
      checkouts: 1,
      purchases: 1,
      conversionRate: 0.5,
    });
  });

  it('isFriend excludes the customer from GO (and can be undone)', async () => {
    await as(staffToken)
      .put(`/v1/admin/customers/${CUSTOMER.phone}/friend`)
      .send({ isFriend: true })
      .expect(200);
    await eventually(dashboard, (b) => b.go.count === 0);
    expect((await dashboard()).go.count).toBe(0);
    const friends = await as(staffToken).get('/v1/admin/orders?isFriend=true').expect(200);
    expect(friends.body.items.map((o: { code: string }) => o.code)).toContain(preOrder.code);
    await as(staffToken)
      .put(`/v1/admin/customers/${CUSTOMER.phone}/friend`)
      .send({ isFriend: false })
      .expect(200);
    await eventually(dashboard, (b) => b.go.count === 1);
  });

  it('a COD order confirmed by phone never counts for GO', async () => {
    const placed = await expectStatus(checkout(lampVariant, { paymentMethod: 'COD' }), 201);
    codOrder = {
      id: '',
      code: placed.body.orderCode as string,
      paymentId: placed.body.payment.id as string,
    };
    await as(staffToken).post(`/v1/admin/payments/${codOrder.paymentId}/confirm-cod`).expect(200);
    const list = await eventually(
      () => as(staffToken).get(`/v1/admin/orders?q=${codOrder.code}`),
      (r) => r.body.items[0]?.status === 'CONFIRMED',
    );
    codOrder.id = list.body.items[0].id as string;
    await new Promise((r) => setTimeout(r, 800));
    expect((await dashboard()).go.count).toBe(1);
  });

  it('notes, status transitions and shipments over HTTP', async () => {
    await as(staffToken)
      .post(`/v1/admin/orders/${preOrder.id}/notes`)
      .send({ text: 'Called the customer, walnut finish confirmed' })
      .expect(201);
    await as(staffToken)
      .post(`/v1/admin/orders/${preOrder.id}/transitions`)
      .send({ to: 'IN_PRODUCTION' })
      .expect(200);
    expect(
      (
        await as(staffToken)
          .post(`/v1/admin/orders/${codOrder.id}/transitions`)
          .send({ to: 'IN_PRODUCTION' })
          .expect(409)
      ).body.error.code,
    ).toBe('INVALID_ORDER_TRANSITION');
    await as(staffToken)
      .post(`/v1/admin/orders/${codOrder.id}/transitions`)
      .send({ to: 'READY_TO_SHIP' })
      .expect(200);
    await as(staffToken)
      .post(`/v1/admin/orders/${codOrder.id}/shipment`)
      .send({ courier: 'MANUAL', consignmentId: 'SF-778899' })
      .expect(201);
    await as(staffToken)
      .patch(`/v1/admin/orders/${codOrder.id}/shipment`)
      .send({ status: 'PICKED_UP' })
      .expect(200);
    const detail = await as(staffToken).get(`/v1/admin/orders/${preOrder.id}`).expect(200);
    expect(detail.body.status).toBe('IN_PRODUCTION');
    expect(detail.body.notes).toEqual([
      expect.objectContaining({ author: staffId, text: expect.stringContaining('walnut') }),
    ]);
    expect(detail.body.history.map((h: { to: string }) => h.to)).toEqual([
      'PENDING_PAYMENT',
      'CONFIRMED',
      'IN_PRODUCTION',
    ]);
    expect(
      (await as(staffToken).get(`/v1/admin/orders/${codOrder.id}`).expect(200)).body.shipment,
    ).toMatchObject({ courier: 'MANUAL', status: 'PICKED_UP', consignmentId: 'SF-778899' });
    // GO still counts IN_PRODUCTION
    expect((await dashboard()).go.count).toBe(1);
  });

  it('CSV export lists the orders', async () => {
    const res = await as(staffToken).get('/v1/admin/orders.csv').expect(200);
    expect(res.text).toContain(preOrder.code);
    expect(res.text).toContain(codOrder.code);
    expect(res.text).toContain(`'+880${CUSTOMER.phone.slice(1)}`);
  });

  it('SMS notifications were sent (console provider) for each stage', async () => {
    const logs = await eventually(
      () =>
        svc(stack.notification, NotificationDb).notificationLog.findMany({
          orderBy: { createdAt: 'asc' },
        }),
      // Separate events: wait for both SMS, not just the last one to be produced.
      (l) =>
        l.filter((x) => x.template === 'order.confirmed.cod').length === 1 &&
        l.some((x) => x.template === 'payment.verified'),
    );
    const templates = logs.map((l) => l.template);
    expect(templates.filter((t) => t === 'order.placed')).toHaveLength(2);
    expect(templates).toEqual(expect.arrayContaining(['payment.verified', 'order.confirmed.cod']));
    expect(
      logs.every((l) => l.status === 'SENT' && l.recipient === `+880${CUSTOMER.phone.slice(1)}`),
    ).toBe(true);
  });

  it('B2B: RFQ -> discount guard -> OWNER prices -> accept -> COD convert is OWNER only -> B2B order at quoted prices', async () => {
    const rfq = await http()
      .post('/v1/quote-requests')
      .set('cf-turnstile-response', 'dev-pass')
      .send({
        organizationName: 'Hotel Sea Pearl',
        contactName: 'Faria Rahman',
        phone: '01933333333',
        email: 'purchase@seapearl.example',
        items: [{ description: 'Alo-Arch Panel, walnut, for 40 rooms', qty: 40 }],
        neededBy: '2026-12-15',
        customizationNotes: 'Engrave hotel logo on the frame',
      })
      .expect(201);
    const quoteCode = rfq.body.quoteCode as string;
    expect(quoteCode).toMatch(/^QT-[2-9A-HJKMNP-Z]{6}$/);

    const quotes = await as(staffToken).get(`/v1/admin/quotes?q=${quoteCode}`).expect(200);
    const quoteId = quotes.body.items[0].id as string;
    const quote = await as(staffToken).get(`/v1/admin/quotes/${quoteId}`).expect(200);
    const lineId = quote.body.lines[0].id as string;

    // 25% below RETAIL (349000 -> 261750)
    const deep = {
      lines: [{ lineId, variantId: aloWalnut, unitPricePaisa: 261750 }],
      shippingFeePaisa: 150000,
      advanceRequiredPaisa: 0,
    };
    expect(
      (
        await as(staffToken)
          .put(`/v1/admin/quotes/${quoteId}/pricing`)
          .send({ ...deep, allowDeepDiscount: true })
          .expect(422)
      ).body.error.code,
    ).toBe('DISCOUNT_TOO_DEEP');
    expect(
      (await as(ownerToken).put(`/v1/admin/quotes/${quoteId}/pricing`).send(deep).expect(422)).body
        .error.code,
    ).toBe('DISCOUNT_TOO_DEEP');
    const priced = await as(ownerToken)
      .put(`/v1/admin/quotes/${quoteId}/pricing`)
      .send({ ...deep, allowDeepDiscount: true })
      .expect(200);
    expect(priced.body).toMatchObject({
      status: 'QUOTED',
      totals: { subtotalPaisa: 261750 * 40, shippingFeePaisa: 150000, advanceRequiredPaisa: 0 },
    });
    const validDays = (Date.parse(priced.body.validUntil as string) - Date.now()) / 86_400_000;
    expect(validDays).toBeGreaterThan(6.9);
    expect(validDays).toBeLessThan(7.1);

    const tracked = await http()
      .get(`/v1/quote-requests/track?code=${quoteCode}&phone=01933333333`)
      .expect(200);
    expect(tracked.body).toMatchObject({
      status: 'QUOTED',
      totals: { totalPaisa: 261750 * 40 + 150000 },
    });

    await as(staffToken).post(`/v1/admin/quotes/${quoteId}/accept`).expect(200);
    const conversion = {
      address: { district: 'coxs-bazar', area: 'Kolatoli', line: 'Hotel Sea Pearl, Kolatoli Road' },
      paymentMethod: 'COD',
    };
    expect(
      (
        await as(staffToken)
          .post(`/v1/admin/quotes/${quoteId}/convert`)
          .send(conversion)
          .expect(422)
      ).body.error.code,
    ).toBe('COD_CONVERSION_OWNER_ONLY');

    // change the catalog price: conversion must still use the quoted price
    await as(ownerToken)
      .put(`/v1/admin/variants/${aloWalnut}/price`)
      .send({ amountPaisa: 399000 })
      .expect(200);
    const converted = await as(ownerToken)
      .post(`/v1/admin/quotes/${quoteId}/convert`)
      .send(conversion)
      .expect(201);
    const order = await as(staffToken)
      .get(`/v1/admin/orders/${converted.body.orderId}`)
      .expect(200);
    expect(order.body).toMatchObject({
      channel: 'B2B',
      quoteCode,
      status: 'PENDING_PAYMENT',
      paymentMethod: 'COD',
      items: [
        expect.objectContaining({ qty: 40, unitPricePaisa: 261750, lineTotalPaisa: 261750 * 40 }),
      ],
      totals: {
        shippingFeePaisa: 150000,
        totalPaisa: 261750 * 40 + 150000,
        advanceRequiredPaisa: 0,
      },
    });
    expect(
      (
        await as(ownerToken)
          .post(`/v1/admin/quotes/${quoteId}/convert`)
          .send(conversion)
          .expect(409)
      ).body.error.code,
    ).toBe('QUOTE_ALREADY_CONVERTED');
    expect(
      (await http().get(`/v1/quote-requests/track?code=${quoteCode}&phone=01933333333`).expect(200))
        .body.orderCode,
    ).toBe(converted.body.orderCode);

    // the owner was alerted about the RFQ; B2B never counts for GO
    const alert = await eventually(
      () =>
        svc(stack.notification, NotificationDb).notificationLog.findFirst({
          where: { template: 'quote.requested.owner' },
        }),
      (l) => l !== null,
    );
    expect(alert).toMatchObject({
      recipient: '+8801900000000',
      body: expect.stringContaining('Hotel Sea Pearl') as string,
    });
    expect((await dashboard()).go.count).toBe(1);
  });

  it('interior design consultation: stored as a DESIGN lead, listed by kind, never priced', async () => {
    const rfq = await http()
      .post('/v1/quote-requests')
      .set('cf-turnstile-response', 'dev-pass')
      .send({
        kind: 'DESIGN',
        contactName: 'Rafiq Hasan',
        phone: '01944444444',
        design: {
          spaceType: 'RESTAURANT_CAFE',
          sizeSqft: 1800,
          district: 'dhaka',
          budget: 'LAKH_5_TO_15',
        },
        notes: 'New cafe in Dhanmondi, opening in March',
      })
      .expect(201);
    const code = rfq.body.quoteCode as string;

    // A design request without a brief is rejected before anything is stored.
    await http()
      .post('/v1/quote-requests')
      .set('cf-turnstile-response', 'dev-pass')
      .send({ kind: 'DESIGN', contactName: 'No Brief', phone: '01944444445' })
      .expect(400);

    const leads = await as(staffToken).get('/v1/admin/quotes?kind=DESIGN').expect(200);
    const lead = (leads.body.items as { code: string; id: string; kind: string }[]).find(
      (q) => q.code === code,
    );
    expect(lead?.kind).toBe('DESIGN');
    const products = await as(staffToken).get('/v1/admin/quotes?kind=PRODUCT').expect(200);
    expect((products.body.items as { code: string }[]).some((q) => q.code === code)).toBe(false);

    const priced = await as(ownerToken)
      .put(`/v1/admin/quotes/${lead?.id}/pricing`)
      .send({
        lines: [{ lineId: randomUUID(), variantId: randomUUID(), unitPricePaisa: 100_000 }],
        shippingFeePaisa: 0,
        advanceRequiredPaisa: 0,
      })
      .expect(422);
    expect(priced.body.error.code).toBe('DESIGN_REQUEST_NOT_PRICEABLE');

    const build = await http()
      .post('/v1/quote-requests')
      .set('cf-turnstile-response', 'dev-pass')
      .send({
        kind: 'CONSTRUCTION',
        contactName: 'Karim Uddin',
        phone: '01944444446',
        design: { spaceType: 'HOME', sizeSqft: 2400, district: 'gazipur', floors: 4 },
      })
      .expect(201);
    const buildTrack = await http()
      .get(`/v1/quote-requests/track?code=${build.body.quoteCode as string}&phone=01944444446`)
      .expect(200);
    expect(buildTrack.body).toMatchObject({
      kind: 'CONSTRUCTION',
      design: { spaceType: 'HOME', floors: 4 },
    });

    const tracked = await http()
      .get(`/v1/quote-requests/track?code=${code}&phone=01944444444`)
      .expect(200);
    expect(tracked.body).toMatchObject({
      kind: 'DESIGN',
      status: 'NEW',
      organizationName: null,
      design: {
        spaceType: 'RESTAURANT_CAFE',
        sizeSqft: 1800,
        district: 'dhaka',
        budget: 'LAKH_5_TO_15',
      },
    });
  });

  it('quotes expire after validUntil and cannot be accepted or converted', async () => {
    const rfq = await http()
      .post('/v1/quote-requests')
      .set('cf-turnstile-response', 'dev-pass')
      .send({
        organizationName: 'Cafe Aroma',
        contactName: 'Nadia',
        phone: '01944444444',
        items: [{ description: 'Panels', qty: 12 }],
      })
      .expect(201);
    const quoteId = (
      await as(staffToken).get(`/v1/admin/quotes?q=${rfq.body.quoteCode}`).expect(200)
    ).body.items[0].id as string;
    const lineId = (await as(staffToken).get(`/v1/admin/quotes/${quoteId}`).expect(200)).body
      .lines[0].id as string;
    await as(staffToken)
      .put(`/v1/admin/quotes/${quoteId}/pricing`)
      .send({
        lines: [{ lineId, variantId: aloWalnut, unitPricePaisa: 340000 }],
        advanceRequiredPaisa: 100000,
        validUntil: new Date(Date.now() + 1500).toISOString(),
      })
      .expect(200);
    await new Promise((r) => setTimeout(r, 1700));
    expect(
      (await as(staffToken).post(`/v1/admin/quotes/${quoteId}/accept`).expect(409)).body.error.code,
    ).toBe('QUOTE_EXPIRED');
    expect((await as(staffToken).get(`/v1/admin/quotes/${quoteId}`).expect(200)).body.status).toBe(
      'EXPIRED',
    );
    expect(await svc(stack.order, QuoteService).expireDue()).toBe(0); // already expired lazily
  });

  it('audit log: OWNER sees who did what; STAFF cannot', async () => {
    await as(staffToken).get('/v1/admin/audit-log').expect(403);
    const page = await eventually(
      () => as(ownerToken).get('/v1/admin/audit-log?limit=100').expect(200),
      (r) => (r.body.items as { action: string }[]).some((i) => i.action === 'quote.convert'),
    );
    const items = page.body.items as { action: string; actor: { id: string; role: string } }[];
    const actions = new Set(items.map((i) => i.action));
    for (const a of [
      'product.create',
      'variant.create',
      'price.setBase',
      'product.publish',
      'stock.adjust',
      'media.confirm',
      'payment.verify',
      'payment.confirmCod',
      'customer.setFriend',
      'order.addNote',
      'order.transition',
      'shipment.create',
      'shipment.updateStatus',
      'quote.price',
      'quote.accept',
      'quote.convert',
    ]) {
      expect([a, actions.has(a)]).toEqual([a, true]);
    }
    expect(items.find((i) => i.action === 'payment.verify')?.actor).toEqual({
      id: staffId,
      role: 'STAFF',
    });
    expect(items.find((i) => i.action === 'quote.convert')?.actor.role).toBe('OWNER');
  });
});
