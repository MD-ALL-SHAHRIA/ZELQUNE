import { type INestApplication } from '@nestjs/common';
import { type PrivacyExport, type PrivacyRequestDetail } from '@zelqune/contracts';
import { Redis } from 'ioredis';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { PrismaService as AnalyticsDb } from '../../apps/analytics-service/src/prisma/prisma.service';
import { PasswordService } from '../../apps/identity-service/src/auth/password.service';
import { seedOwner } from '../../apps/identity-service/src/seed/owner.seed';
import { UserRepository } from '../../apps/identity-service/src/users/user.repository';
import { PrismaService as NotificationDb } from '../../apps/notification-service/src/prisma/prisma.service';
import { customerKey } from '../../apps/order-service/src/domain/customer-key';
import { PrismaService as OrderDb } from '../../apps/order-service/src/prisma/prisma.service';
import { PrismaService as PaymentDb } from '../../apps/payment-service/src/prisma/prisma.service';
import { prepareDatabase } from './database';
import { IT } from './it-env';
import { OWNER, type Stack, startStack } from './stack';

const STAFF = { phone: '01811111112', password: 'integration-staff-pass' };
const PHONE = '01755555555';
const E164 = '+8801755555555';
const KEY_SECRET = 'it-customer-key-secret-0123456789abcdef';

async function eventually<T>(fn: () => Promise<T>, ok: (v: T) => boolean, ms = 12_000): Promise<T> {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (ok(v) || Date.now() > end) return v;
    await new Promise((r) => setTimeout(r, 200));
  }
}

describe('privacy requests (ADR 0020) on real infrastructure', () => {
  let stack: Stack;
  let gw: INestApplication;
  let redis: Redis;
  let ownerToken = '';
  let staffToken = '';
  let ip = 0;
  const http = () => request(gw.getHttpServer());
  const owner = {
    get: (p: string) => http().get(p).set('Authorization', `Bearer ${ownerToken}`),
    post: (p: string) => http().post(p).set('Authorization', `Bearer ${ownerToken}`),
  };
  const db = <T>(
    app: INestApplication | undefined,
    token: abstract new (...a: never[]) => T,
  ): T => {
    if (!app) throw new Error('service not started');
    return app.get(token);
  };
  const submit = (body: object) =>
    http()
      .post('/v1/privacy-requests')
      .set('cf-turnstile-response', 'dev-pass')
      .set('x-forwarded-for', `198.30.0.${++ip}`)
      .send(body);
  const idOf = async (code: string) => {
    const list = await owner.get('/v1/admin/privacy-requests?limit=100').expect(200);
    return (list.body.items as { id: string; code: string }[]).find((i) => i.code === code)!.id;
  };

  // Realistic records for one customer: a delivered sale, a cancelled unpaid order, a running
  // order, a design request; plus what other services hold about them.
  const ids = { delivered: randomUUID(), cancelled: randomUUID(), running: randomUUID() };
  const order = (id: string, code: string, status: string, confirmed: boolean) => ({
    id,
    code,
    cartId: randomUUID(),
    customerName: 'Nusrat Jahan',
    customerPhone: E164,
    address: { district: 'dhaka', area: 'Mirpur', line: 'House 9, Road 3' },
    saleMode: 'PRE_ORDER' as const,
    status: status as never,
    paymentMethod: 'BKASH_MANUAL' as const,
    subtotalPaisa: 349000,
    shippingFeePaisa: 8000,
    totalPaisa: 357000,
    advanceRequiredPaisa: 30000,
    shippingZone: 'DHAKA',
    chargeableWeightGrams: 2000,
    confirmedAt: confirmed ? new Date() : null,
    sessionId: 'sess-privacy-1',
  });

  beforeAll(async () => {
    const database = await prepareDatabase('zelqune_it_privacy');
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
    const passwords = db(stack.identity, PasswordService);
    await db(stack.identity, UserRepository).upsertAdmin({
      phone: '+8801811111112',
      name: 'IT Staff',
      role: 'STAFF',
      passwordHash: await passwords.hash(STAFF.password),
    });
    const login = async (phone: string, password: string) =>
      (
        await http()
          .post('/v1/admin/auth/login')
          .set('x-forwarded-for', `198.31.0.${++ip}`)
          .send({ phone, password })
          .expect(200)
      ).body.accessToken as string;
    ownerToken = await login(OWNER.phone, OWNER.password);
    staffToken = await login(STAFF.phone, STAFF.password);

    const orders = db(stack.order, OrderDb);
    await orders.order.create({ data: order(ids.delivered, 'ZQ-DEVRD2', 'DELIVERED', true) });
    await orders.order.create({ data: order(ids.cancelled, 'ZQ-CNCSD2', 'CANCELLED', false) });
    await orders.order.create({ data: order(ids.running, 'ZQ-RNNNG2', 'IN_PRODUCTION', true) });
    await orders.orderNote.create({
      data: {
        orderId: ids.cancelled,
        text: 'Customer asked to call after 6pm',
        authorId: 'x',
        authorRole: 'STAFF',
      },
    });
    await orders.customer.create({ data: { phone: E164, isFriend: true } });
    await http()
      .post('/v1/quote-requests')
      .set('cf-turnstile-response', 'dev-pass')
      .send({
        kind: 'DESIGN',
        contactName: 'Nusrat Jahan',
        phone: PHONE,
        email: 'nusrat@example.com',
        design: { spaceType: 'HOME', district: 'dhaka' },
        items: [{ description: 'Living room wall', qty: 1 }],
      })
      .expect(201);
    await db(stack.payment, PaymentDb).payment.create({
      data: {
        orderId: ids.cancelled,
        orderCode: 'ZQ-CNCSD2',
        method: 'BKASH_MANUAL',
        kind: 'ADVANCE',
        status: 'REJECTED',
        amountPaisa: 30000,
        payerPhone: E164,
      } as never,
    });
    await db(stack.notification, NotificationDb).notificationLog.create({
      data: {
        eventId: randomUUID(),
        template: 'order.placed',
        recipient: E164,
        body: 'Hi Nusrat, your order ZQ-CNCSD2 is placed',
        status: 'SENT',
        provider: 'console',
      } as never,
    });
    await db(stack.analytics, AnalyticsDb).orderFact.create({
      data: {
        orderId: ids.delivered,
        code: 'ZQ-DEVRD2',
        customerKey: customerKey(KEY_SECRET, E164),
        sessionId: 'sess-privacy-1',
      },
    });
  });

  afterAll(async () => {
    await stack?.close();
    await redis?.quit();
  });

  it('validates input and answers the same for unknown numbers (no enumeration)', async () => {
    await submit({ type: 'ACCESS', phone: '12345' }).expect(400);
    await submit({ type: 'CORRECTION', phone: PHONE, details: '' }).expect(400);
    await submit({ type: 'ACCESS', phone: PHONE, reference: 'NOT-A-CODE' }).expect(400);
    const unknown = await submit({ type: 'ACCESS', phone: '01999999999' }).expect(201);
    expect(Object.keys(unknown.body)).toEqual(['code']);
  });

  it('a duplicate open request returns the same code; tracking needs code and phone', async () => {
    const a = await submit({ type: 'ACCESS', phone: PHONE, reference: 'ZQ-DEVRD2' }).expect(201);
    const b = await submit({ type: 'ACCESS', phone: PHONE }).expect(201);
    expect(b.body.code).toBe(a.body.code);
    const t = await http()
      .post('/v1/privacy-requests/track')
      .send({ code: a.body.code, phone: PHONE })
      .expect(200);
    expect(t.body).toMatchObject({ code: a.body.code, type: 'ACCESS', status: 'PENDING' });
    expect(t.body.phone).toBeUndefined();
    await http()
      .post('/v1/privacy-requests/track')
      .send({ code: a.body.code, phone: '01999999999' })
      .expect(404);
  });

  it('only the owner reaches the queue; the list carries no contact details', async () => {
    await http().get('/v1/admin/privacy-requests').expect(401);
    await http()
      .get('/v1/admin/privacy-requests')
      .set('Authorization', `Bearer ${staffToken}`)
      .expect(403);
    const list = await owner.get('/v1/admin/privacy-requests').expect(200);
    expect(list.body.items.length).toBeGreaterThan(0);
    expect(JSON.stringify(list.body)).not.toContain('555555');
    const id = list.body.items[0].id as string;
    await http()
      .post(`/v1/admin/privacy-requests/${id}/verify`)
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ method: 'CALLED_NUMBER_ON_FILE' })
      .expect(403);
  });

  it('access: nothing is shown before verification; then a full export; then completed', async () => {
    const code = (await submit({ type: 'ACCESS', phone: PHONE }).expect(201)).body.code as string;
    const id = await idOf(code);
    const detail = (await owner.get(`/v1/admin/privacy-requests/${id}`).expect(200))
      .body as PrivacyRequestDetail;
    expect(detail.referenceMatched).toBe(true);
    expect(detail.found).toEqual({ orders: 3, quotes: 1 });

    const early = await owner.post(`/v1/admin/privacy-requests/${id}/export`).expect(409);
    expect(early.body.error.code).toBe('PRIVACY_NOT_VERIFIED');
    await owner
      .post(`/v1/admin/privacy-requests/${id}/complete`)
      .send({ note: 'sent it' })
      .expect(409);
    await owner
      .post(`/v1/admin/privacy-requests/${id}/verify`)
      .send({ method: 'CALLED_NUMBER_ON_FILE', note: 'Called back, confirmed order ZQ-DEVRD2' })
      .expect(200);
    await owner
      .post(`/v1/admin/privacy-requests/${id}/verify`)
      .send({ method: 'CALLED_NUMBER_ON_FILE' })
      .expect(409);
    await owner.post(`/v1/admin/privacy-requests/${id}/erase`).expect(409); // wrong action
    await owner
      .post(`/v1/admin/privacy-requests/${id}/complete`)
      .send({ note: 'Sent the export' })
      .expect(409); // export first
    const data = (await owner.post(`/v1/admin/privacy-requests/${id}/export`).expect(200))
      .body as PrivacyExport;
    expect(data.orders.map((o) => o.code).sort()).toEqual(['ZQ-CNCSD2', 'ZQ-DEVRD2', 'ZQ-RNNNG2']);
    expect(data.quotes[0]?.email).toBe('nusrat@example.com');
    expect(data.customerFlag).toEqual({ isFriend: true });
    expect(data.elsewhere.length).toBeGreaterThan(0);
    const done = await owner
      .post(`/v1/admin/privacy-requests/${id}/complete`)
      .send({ note: 'Sent the export on WhatsApp to the number on file' })
      .expect(200);
    expect(done.body.status).toBe('COMPLETED');
  });

  it('correction updates the name on every record for the phone', async () => {
    const code = (
      await submit({
        type: 'CORRECTION',
        phone: PHONE,
        details: 'My name is spelt Nusrat Jahan Mim',
      })
    ).body.code as string;
    const id = await idOf(code);
    await owner
      .post(`/v1/admin/privacy-requests/${id}/verify`)
      .send({ method: 'WHATSAPP_FROM_NUMBER_ON_FILE' })
      .expect(200);
    const r = await owner
      .post(`/v1/admin/privacy-requests/${id}/correct`)
      .send({ name: 'Nusrat Jahan Mim' })
      .expect(200);
    expect(r.body.result).toEqual({ kind: 'CORRECTION', fields: ['name'], orders: 3, quotes: 1 });
    const o = await db(stack.order, OrderDb).order.findUnique({ where: { id: ids.delivered } });
    expect(o?.customerName).toBe('Nusrat Jahan Mim');
  });

  it('deletion: blocked by a running order, then erases what may go and keeps the sale', async () => {
    const code = (await submit({ type: 'DELETION', phone: PHONE })).body.code as string;
    const id = await idOf(code);
    await owner.post(`/v1/admin/privacy-requests/${id}/ask-verification`).send({}).expect(200);
    await owner
      .post(`/v1/admin/privacy-requests/${id}/verify`)
      .send({ method: 'CALLED_NUMBER_ON_FILE' })
      .expect(200);
    const blocked = await owner.post(`/v1/admin/privacy-requests/${id}/erase`).expect(409);
    expect(blocked.body.error.code).toBe('PRIVACY_ORDERS_ACTIVE');
    expect(blocked.body.error.message).toContain('ZQ-RNNNG2');

    const orders = db(stack.order, OrderDb);
    await orders.order.update({ where: { id: ids.running }, data: { status: 'DELIVERED' } });
    const r = await owner.post(`/v1/admin/privacy-requests/${id}/erase`).expect(200);
    const detail = r.body as PrivacyRequestDetail;
    expect(detail.status).toBe('COMPLETED');
    expect(detail.result).toMatchObject({
      kind: 'ERASURE',
      erasedOrders: ['ZQ-CNCSD2'],
      retainedOrders: expect.arrayContaining([
        { code: 'ZQ-DEVRD2', reason: 'SALE_RECORD' },
        { code: 'ZQ-RNNNG2', reason: 'SALE_RECORD' },
      ]),
      customerFlagDeleted: true,
    });
    expect((detail.result as { erasedQuotes: string[] }).erasedQuotes).toHaveLength(1);

    const cancelled = await orders.order.findUnique({ where: { id: ids.cancelled } });
    expect(cancelled).toMatchObject({
      customerName: 'ERASED',
      customerPhone: 'ERASED',
      sessionId: null,
    });
    expect(await orders.orderNote.count({ where: { orderId: ids.cancelled } })).toBe(0);
    const kept = await orders.order.findUnique({ where: { id: ids.delivered } });
    expect(kept?.customerPhone).toBe(E164);
    const quote = await orders.quote.findFirst({ where: { contactName: 'ERASED' } });
    expect(quote).toMatchObject({ phone: 'ERASED', email: null });
    expect(await orders.customer.count({ where: { phone: E164 } })).toBe(0);

    // Other services follow the privacy.erased event.
    const payment = await eventually(
      () => db(stack.payment, PaymentDb).payment.findFirst({ where: { orderId: ids.cancelled } }),
      (p) => p?.payerPhone === null,
    );
    expect(payment?.payerPhone).toBeNull();
    const log = await eventually(
      () =>
        db(stack.notification, NotificationDb).notificationLog.findFirst({
          where: { template: 'order.placed' },
        }),
      (l) => l?.recipient === 'ERASED',
    );
    expect(log).toMatchObject({ recipient: 'ERASED', body: '[erased on request]' });
    const fact = await eventually(
      () =>
        db(stack.analytics, AnalyticsDb).orderFact.findUnique({
          where: { orderId: ids.delivered },
        }),
      (f) => f?.customerKey === null,
    );
    expect(fact).toMatchObject({ customerKey: null, sessionId: null });

    // The requester can still check the status after the erasure.
    const t = await http()
      .post('/v1/privacy-requests/track')
      .send({ code, phone: PHONE })
      .expect(200);
    expect(t.body.status).toBe('COMPLETED');
  });

  it('a rejected request is final', async () => {
    const code = (await submit({ type: 'CONSENT_WITHDRAWAL', phone: '01766666666' })).body
      .code as string;
    const id = await idOf(code);
    await owner.post(`/v1/admin/privacy-requests/${id}/reject`).send({ reason: 'x' }).expect(400);
    await owner
      .post(`/v1/admin/privacy-requests/${id}/reject`)
      .send({ reason: 'Could not reach the number on file after three calls' })
      .expect(200);
    await owner
      .post(`/v1/admin/privacy-requests/${id}/verify`)
      .send({ method: 'CALLED_NUMBER_ON_FILE' })
      .expect(409);
  });
});
