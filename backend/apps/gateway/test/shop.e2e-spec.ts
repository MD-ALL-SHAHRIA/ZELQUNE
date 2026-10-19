import { AppError } from '@zelqune/common';
import request from 'supertest';
import { ALLOWED_ORIGIN, createGatewayHarness, type GatewayHarness } from './helpers';

const TOKEN = 'cart-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const OTHER = 'cart-token-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const ORDER_ID = '0b6f0a3e-7f2a-4c35-9a5e-2f1d0c1b2a3e';

const checkoutBody = {
  customer: { name: 'Rahim', phone: '01712345678' },
  address: { district: 'dhaka', area: 'Mirpur', line: 'House 1, Road 2' },
  paymentMethod: 'COD',
};
const checkoutResponse = {
  orderCode: 'ZQ-7K3M9P',
  status: 'PENDING_PAYMENT',
  saleMode: 'IN_STOCK',
  totals: {
    subtotalPaisa: 349000,
    discountPaisa: 0,
    shippingFeePaisa: 17000,
    totalPaisa: 366000,
    advanceRequiredPaisa: 0,
  },
  payment: {
    id: ORDER_ID,
    method: 'COD',
    kind: 'COD',
    status: 'COD_PENDING',
    amountPaisa: 366000,
    trxIdLast4: null,
  },
};

describe('shop routes (e2e, services mocked)', () => {
  let h: GatewayHarness;
  let ip = 0;
  const nextIp = () => `203.0.113.${++ip}`;

  beforeEach(async () => {
    h = await createGatewayHarness({ CHECKOUT_MAX_PER_IP: '100' });
  });
  afterEach(async () => {
    await h.app.close();
  });

  const checkout = (
    opts: { token?: string; key?: string; turnstile?: string; body?: object; from?: string } = {},
  ) => {
    const req = request(h.app.getHttpServer())
      .post('/v1/checkout')
      .set('x-forwarded-for', opts.from ?? nextIp());
    if (opts.token !== '') req.set('x-cart-token', opts.token ?? TOKEN);
    if (opts.key !== '') req.set('idempotency-key', opts.key ?? 'checkout-key-0001');
    if (opts.turnstile !== '') req.set('cf-turnstile-response', opts.turnstile ?? 'dev-pass');
    return req.send(opts.body ?? checkoutBody);
  };

  it('CORS preflight lets the storefront send cart, idempotency and Turnstile headers', async () => {
    const res = await request(h.app.getHttpServer())
      .options('/v1/checkout')
      .set('Origin', ALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'POST')
      .set(
        'Access-Control-Request-Headers',
        'content-type,x-cart-token,idempotency-key,cf-turnstile-response',
      )
      .expect(204);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
    const allowed = String(res.headers['access-control-allow-headers']).toLowerCase().split(',');
    for (const header of ['x-cart-token', 'idempotency-key', 'cf-turnstile-response']) {
      expect(allowed).toContain(header);
    }
  });

  it('CORS preflight from a foreign origin gets no allow-origin header', async () => {
    const res = await request(h.app.getHttpServer())
      .options('/v1/checkout')
      .set('Origin', 'https://evil.example')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'x-cart-token');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('lists districts publicly', async () => {
    h.clients.shipping.send.mockResolvedValueOnce({
      items: [{ code: 'dhaka', nameBn: 'ঢাকা', nameEn: 'Dhaka', division: 'Dhaka' }],
    });
    const res = await request(h.app.getHttpServer()).get('/v1/shipping/districts').expect(200);
    expect(res.body.items[0].code).toBe('dhaka');
  });

  describe('GET /v1/shipping/estimate', () => {
    const VARIANT = '5d3b8f0e-2c1a-4b6e-9f7d-1a2b3c4d5e6f';
    const estimate = (query: string) =>
      request(h.app.getHttpServer()).get(`/v1/shipping/estimate?${query}`);

    it('quotes one variant with its package size, like checkout', async () => {
      h.clients.catalog.send.mockResolvedValueOnce({
        [VARIANT]: {
          variantId: VARIANT,
          packageWeightGrams: 2400,
          packageLengthMm: 700,
          packageWidthMm: 380,
          packageHeightMm: 80,
        },
      });
      h.clients.shipping.send.mockResolvedValueOnce({
        zone: 'OUTSIDE',
        district: 'chattogram',
        actualWeightGrams: 4800,
        volumetricWeightGrams: 8512,
        chargeableWeightGrams: 9000,
        feePaisa: 31000,
      });
      const res = await estimate(`district=chattogram&variantId=${VARIANT}&qty=2`).expect(200);
      expect(res.body).toEqual({
        district: 'chattogram',
        zone: 'OUTSIDE',
        chargeableWeightGrams: 9000,
        feePaisa: 31000,
      });
      expect(h.clients.catalog.send).toHaveBeenCalledWith('catalog.variants.checkoutSnapshot', {
        variantIds: [VARIANT],
      });
      expect(h.clients.shipping.send).toHaveBeenCalledWith('shipping.quotes.quote', {
        district: 'chattogram',
        lines: [
          {
            qty: 2,
            packageWeightGrams: 2400,
            packageLengthMm: 700,
            packageWidthMm: 380,
            packageHeightMm: 80,
          },
        ],
      });
    });

    it('defaults qty to 1 and is 404 for a variant that is not sellable', async () => {
      h.clients.catalog.send.mockResolvedValueOnce({});
      const res = await estimate(`district=dhaka&variantId=${VARIANT}`).expect(404);
      expect(res.body.error.code).toBe('VARIANT_NOT_AVAILABLE');
      expect(h.clients.shipping.send).not.toHaveBeenCalled();
    });

    it('validates the query before calling any service', async () => {
      await estimate(`district=Dhaka!&variantId=${VARIANT}`).expect(400);
      await estimate('district=dhaka&variantId=nope').expect(400);
      await estimate(`district=dhaka&variantId=${VARIANT}&qty=0`).expect(400);
      expect(h.clients.catalog.send).not.toHaveBeenCalled();
    });
  });

  it('cart routes need X-Cart-Token and validate input', async () => {
    expect(
      (await request(h.app.getHttpServer()).get('/v1/carts/current').expect(400)).body.error.code,
    ).toBe('CART_TOKEN_REQUIRED');
    await request(h.app.getHttpServer())
      .put('/v1/carts/current/items/not-a-uuid')
      .set('x-cart-token', TOKEN)
      .send({ qty: 1 })
      .expect(400);
    await request(h.app.getHttpServer())
      .put(`/v1/carts/current/items/${ORDER_ID}`)
      .set('x-cart-token', TOKEN)
      .send({ qty: 101 })
      .expect(400);
    expect(h.clients.order.send).not.toHaveBeenCalled();
  });

  it('checkout requires a Turnstile token and rejects failed ones', async () => {
    expect((await checkout({ turnstile: '' }).expect(403)).body.error.code).toBe(
      'TURNSTILE_REQUIRED',
    );
    expect((await checkout({ turnstile: 'fail-bot' }).expect(403)).body.error.code).toBe(
      'TURNSTILE_FAILED',
    );
    expect(h.clients.order.send).not.toHaveBeenCalled();
  });

  it('checkout requires an Idempotency-Key and a cart token', async () => {
    expect((await checkout({ key: '' }).expect(400)).body.error.code).toBe(
      'IDEMPOTENCY_KEY_REQUIRED',
    );
    expect((await checkout({ token: '' }).expect(400)).body.error.code).toMatch(
      /CART_TOKEN_REQUIRED|IDEMPOTENCY_SCOPE_REQUIRED/,
    );
  });

  it('validates the body (manual payment without trxId, bad phone)', async () => {
    const res = await checkout({ body: { ...checkoutBody, paymentMethod: 'BKASH_MANUAL' } }).expect(
      400,
    );
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    await checkout({ body: { ...checkoutBody, customer: { name: 'R', phone: '123' } } }).expect(
      400,
    );
  });

  it('replays the same checkout (same cart + key) with the original 201 and body', async () => {
    h.clients.order.send.mockResolvedValue(checkoutResponse);
    const first = await checkout().expect(201);
    const second = await checkout().expect(201);
    expect(second.body).toEqual(first.body);
    expect(second.headers['idempotency-replayed']).toBe('true');
    expect(h.clients.order.send).toHaveBeenCalledTimes(1);
    expect(h.clients.order.send).toHaveBeenCalledWith(
      'order.checkout.checkout',
      expect.objectContaining({
        cartToken: TOKEN,
        request: expect.objectContaining({ paymentMethod: 'COD' }),
      }),
      { timeoutMs: 20000 },
    );

    // the same key from another cart is a different checkout
    await checkout({ token: OTHER }).expect(201);
    expect(h.clients.order.send).toHaveBeenCalledTimes(2);
    // a different body with the same cart+key is refused
    expect(
      (
        await checkout({
          body: { ...checkoutBody, customer: { name: 'Karim', phone: '01712345678' } },
        }).expect(422)
      ).body.error.code,
    ).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('failed checkouts are not replayed (key released)', async () => {
    h.clients.order.send.mockRejectedValueOnce(
      new AppError('OUT_OF_STOCK', 'Not enough stock', 409, { shortages: [] }),
    );
    expect((await checkout().expect(409)).body.error.code).toBe('OUT_OF_STOCK');
    h.clients.order.send.mockResolvedValueOnce(checkoutResponse);
    await checkout().expect(201);
  });

  it('rate limits checkout per IP', async () => {
    const strict = await createGatewayHarness({ CHECKOUT_MAX_PER_IP: '2' });
    try {
      strict.clients.order.send.mockResolvedValue(checkoutResponse);
      const hit = (n: number) =>
        request(strict.app.getHttpServer())
          .post('/v1/checkout')
          .set('x-forwarded-for', '192.0.2.77')
          .set('x-cart-token', TOKEN)
          .set('idempotency-key', `checkout-key-${n}000`)
          .set('cf-turnstile-response', 'dev-pass')
          .send(checkoutBody);
      await hit(1).expect(201);
      await hit(2).expect(201);
      expect((await hit(3).expect(429)).body.error.code).toBe('TOO_MANY_REQUESTS');
    } finally {
      await strict.app.close();
    }
  });

  it('tracking composes order, payment and shipment and hides the internal order id', async () => {
    h.clients.order.send.mockResolvedValueOnce({
      orderId: ORDER_ID,
      code: 'ZQ-7K3M9P',
      status: 'PENDING_PAYMENT',
      saleMode: 'IN_STOCK',
      placedAt: new Date().toISOString(),
      items: [],
      totals: checkoutResponse.totals,
      history: [{ status: 'PENDING_PAYMENT', at: new Date().toISOString() }],
    });
    h.clients.payment.send.mockResolvedValueOnce(checkoutResponse.payment);
    h.clients.shipping.send.mockResolvedValueOnce(null);
    const res = await request(h.app.getHttpServer())
      .get('/v1/orders/track?code=zq-7k3m9p&phone=01712345678')
      .expect(200);
    expect(res.body).toMatchObject({
      code: 'ZQ-7K3M9P',
      payment: { status: 'COD_PENDING' },
      shipment: null,
    });
    expect(res.body.orderId).toBeUndefined();
    expect(h.clients.order.send).toHaveBeenCalledWith('order.orders.track', {
      code: 'ZQ-7K3M9P',
      phone: '+8801712345678',
    });
    await request(h.app.getHttpServer())
      .get('/v1/orders/track?code=ZQ-10001&phone=01712345678')
      .expect(400);
  });
});
