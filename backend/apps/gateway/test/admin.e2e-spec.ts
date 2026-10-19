import { requestContext } from '@zelqune/common';
import request from 'supertest';
import { createGatewayHarness, type GatewayHarness } from './helpers';

const ADMIN_ID = '9d1f6c2e-3b4a-4c5d-8e7f-6a5b4c3d2e1f';
const ORDER_ID = '0b6f0a3e-7f2a-4c35-9a5e-2f1d0c1b2a3e';

const summary = {
  id: ORDER_ID,
  code: 'ZQ-7K3M9P',
  channel: 'B2C',
  status: 'PENDING_PAYMENT',
  saleMode: 'PRE_ORDER',
  customerName: '=cmd|calc',
  customerPhone: '+8801712345678',
  isFriend: false,
  paymentMethod: 'BKASH_MANUAL',
  subtotalPaisa: 429000,
  shippingFeePaisa: 17000,
  totalPaisa: 446000,
  advanceRequiredPaisa: 30000,
  district: 'dhaka',
  experimentKey: 'b',
  placedAt: '2026-10-19T10:00:00.000Z',
};

describe('admin routes (e2e, services mocked)', () => {
  let h: GatewayHarness;
  let owner: string;
  let staff: string;
  let customer: string;

  beforeAll(async () => {
    h = await createGatewayHarness();
    owner = await h.signAccessToken({ sub: ADMIN_ID, role: 'OWNER' });
    staff = await h.signAccessToken({ sub: ADMIN_ID, role: 'STAFF' });
    customer = await h.signAccessToken({ sub: ADMIN_ID, role: 'CUSTOMER' });
  });
  afterAll(async () => {
    await h.app.close();
  });
  beforeEach(() => {
    for (const c of Object.values(h.clients)) c.send.mockReset();
  });

  const get = (path: string, token?: string) => {
    const r = request(h.app.getHttpServer()).get(path);
    return token ? r.set('Authorization', `Bearer ${token}`) : r;
  };

  it('every admin route needs a token, and CUSTOMER is forbidden', async () => {
    for (const path of [
      '/v1/admin/orders',
      '/v1/admin/dashboard',
      '/v1/admin/products',
      '/v1/admin/quotes',
      '/v1/admin/stock',
    ]) {
      await get(path).expect(401);
      expect((await get(path, customer).expect(403)).body.error.code).toBe('FORBIDDEN');
    }
  });

  it('audit log is OWNER only', async () => {
    h.clients.analytics.send.mockResolvedValue({ items: [], page: 1, limit: 50, total: 0 });
    expect((await get('/v1/admin/audit-log', staff).expect(403)).body.error.code).toBe('FORBIDDEN');
    await get('/v1/admin/audit-log', owner).expect(200);
  });

  it('passes the admin as actor to downstream services (for audit)', async () => {
    let seen: unknown;
    h.clients.payment.send.mockImplementation(() => {
      seen = requestContext.actor();
      return Promise.resolve({
        id: ORDER_ID,
        method: 'BKASH_MANUAL',
        kind: 'ADVANCE',
        status: 'VERIFIED',
        amountPaisa: 30000,
        trxIdLast4: '5EF3',
      });
    });
    await request(h.app.getHttpServer())
      .post(`/v1/admin/payments/${ORDER_ID}/verify`)
      .set('Authorization', `Bearer ${staff}`)
      .send({ amountReceivedPaisa: 30000 })
      .expect(200);
    expect(seen).toEqual({ id: ADMIN_ID, role: 'STAFF' });
    expect(h.clients.payment.send).toHaveBeenCalledWith('payment.admin.payments.verify', {
      paymentId: ORDER_ID,
      verifiedBy: ADMIN_ID,
      amountReceivedPaisa: 30000,
    });
  });

  it('lists orders with validated filters', async () => {
    h.clients.order.send.mockResolvedValue({ items: [summary], page: 1, limit: 25, total: 1 });
    const res = await get(
      '/v1/admin/orders?status=PENDING_PAYMENT&channel=B2C&isFriend=false&from=2026-10-01',
      staff,
    ).expect(200);
    expect(res.body.total).toBe(1);
    expect(h.clients.order.send).toHaveBeenCalledWith(
      'order.admin.orders.list',
      expect.objectContaining({
        status: 'PENDING_PAYMENT',
        channel: 'B2C',
        isFriend: false,
        from: '2026-10-01',
        page: 1,
        limit: 25,
      }),
    );
    await get('/v1/admin/orders?status=WHATEVER', staff).expect(400);
  });

  it('exports CSV with a download name, BOM and formula-injection protection', async () => {
    h.clients.order.send.mockResolvedValue([summary]);
    const res = await get('/v1/admin/orders.csv?channel=B2C', staff).expect(200);
    expect(res.headers['content-type']).toMatch(/^text\/csv/);
    expect(res.headers['content-disposition']).toMatch(
      /attachment; filename="zelqune-orders-\d{4}-\d{2}-\d{2}\.csv"/,
    );
    expect(res.text.startsWith('﻿Order code,')).toBe(true);
    expect(res.text).toContain("'=cmd|calc");
    expect(res.text).toContain("'+8801712345678");
  });

  it('order detail composes payment and shipment', async () => {
    h.clients.order.send.mockResolvedValue({
      ...summary,
      address: { district: 'dhaka', area: 'Mirpur', line: 'House 1', note: null },
      items: [],
      totals: {
        subtotalPaisa: 429000,
        discountPaisa: 0,
        shippingFeePaisa: 17000,
        totalPaisa: 446000,
        advanceRequiredPaisa: 30000,
      },
      history: [],
      notes: [],
      utm: null,
      organizationId: null,
      quoteCode: null,
      cancelReason: null,
    });
    h.clients.payment.send.mockResolvedValue(null);
    h.clients.shipping.send.mockResolvedValue(null);
    const res = await get(`/v1/admin/orders/${ORDER_ID}`, owner).expect(200);
    expect(res.body).toMatchObject({ code: 'ZQ-7K3M9P', payment: null, shipment: null });
  });

  it('dashboard validates the date range', async () => {
    await get('/v1/admin/dashboard?from=19-10-2026', staff).expect(400);
  });
});

describe('public RFQ and beacon (e2e, services mocked)', () => {
  let h: GatewayHarness;
  beforeAll(async () => {
    h = await createGatewayHarness();
  });
  afterAll(async () => {
    await h.app.close();
  });

  const rfq = {
    organizationName: 'Cafe Aroma',
    contactName: 'Nadia Islam',
    phone: '01812345678',
    items: [{ description: 'Alo-Arch Panel, walnut', qty: 40 }],
  };

  it('RFQ needs Turnstile and validates the request', async () => {
    await request(h.app.getHttpServer()).post('/v1/quote-requests').send(rfq).expect(403);
    await request(h.app.getHttpServer())
      .post('/v1/quote-requests')
      .set('cf-turnstile-response', 'dev-pass')
      .send({ ...rfq, items: [] })
      .expect(400);
    h.clients.order.send.mockResolvedValueOnce({ quoteCode: 'QT-8M4K2P', status: 'NEW' });
    const res = await request(h.app.getHttpServer())
      .post('/v1/quote-requests')
      .set('cf-turnstile-response', 'dev-pass')
      .send(rfq)
      .expect(201);
    expect(res.body).toEqual({ quoteCode: 'QT-8M4K2P', status: 'NEW' });
    expect(h.clients.order.send).toHaveBeenCalledWith(
      'order.quotes.request',
      expect.objectContaining({
        phone: '+8801812345678',
        items: [expect.objectContaining({ qty: 40 })],
      }),
    );
  });

  it('beacon accepts VIEW/ADD_TO_CART only, with a valid session id', async () => {
    h.clients.analytics.send.mockResolvedValue({ ok: true });
    await request(h.app.getHttpServer())
      .post('/v1/events')
      .send({ type: 'VIEW', sessionId: 'sess-0123456789abcdef', p: 'b' })
      .expect(204);
    await request(h.app.getHttpServer())
      .post('/v1/events')
      .send({ type: 'PURCHASE', sessionId: 'sess-0123456789abcdef' })
      .expect(400);
    await request(h.app.getHttpServer())
      .post('/v1/events')
      .send({ type: 'VIEW', sessionId: 'x' })
      .expect(400);
  });
});
