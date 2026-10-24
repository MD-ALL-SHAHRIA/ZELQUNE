import { RPC_PATTERNS } from '@zelqune/contracts';
import request from 'supertest';
import { createGatewayHarness, type GatewayHarness } from './helpers';

const ADMIN_ID = '9d1f6c2e-3b4a-4c5d-8e7f-6a5b4c3d2e1f';
const VARIANT = '3e9a3d6b-0c5d-4f68-9d8b-5c4a3f4e5d6b';
const O = RPC_PATTERNS.order.admin;
const A = RPC_PATTERNS.analytics;

describe('business routes: coupons, sales, reports, finance (e2e, services mocked)', () => {
  let h: GatewayHarness;
  let owner: string;
  let staff: string;

  beforeAll(async () => {
    h = await createGatewayHarness();
    owner = await h.signAccessToken({ sub: ADMIN_ID, role: 'OWNER' });
    staff = await h.signAccessToken({ sub: ADMIN_ID, role: 'STAFF' });
  });
  afterAll(async () => {
    await h.app.close();
  });
  beforeEach(() => {
    for (const c of Object.values(h.clients)) c.send.mockReset();
  });

  const as = (token: string) => ({
    get: (path: string) =>
      request(h.app.getHttpServer()).get(path).set('Authorization', `Bearer ${token}`),
    post: (path: string, body: object) =>
      request(h.app.getHttpServer()).post(path).set('Authorization', `Bearer ${token}`).send(body),
  });

  it('validates coupons before they reach the order service', async () => {
    await as(staff)
      .post('/v1/admin/coupons', { code: 'EID', kind: 'PERCENT', value: 95 })
      .expect(400);
    expect(h.clients.order.send).not.toHaveBeenCalled();
  });

  it('the active sale is public', async () => {
    h.clients.catalog.send.mockResolvedValue({ sale: null });
    await request(h.app.getHttpServer()).get('/v1/catalog/sale').expect(200, { sale: null });
  });

  it('finance is OWNER only', async () => {
    await as(staff).get('/v1/admin/expenses').expect(403);
    await as(staff).get('/v1/admin/reports/profit-loss').expect(403);
  });

  it('profit and loss composes sales, unit costs and expenses', async () => {
    const sold = {
      items: [
        { month: '2026-10', variantId: VARIANT, sku: 'MOON-W', units: 2, revenuePaisa: 700_000 },
      ],
      months: [{ month: '2026-10', grossPaisa: 700_000, discountPaisa: 0, shippingPaisa: 20_000 }],
    };
    const noExpenses = { items: [], totalPaisa: 0, byCategory: [] };
    h.clients.order.send.mockImplementation((pattern: string, data: { from: string }) =>
      Promise.resolve(
        pattern === O.unitsSold && data.from === '2026-10-01' ? sold : { items: [], months: [] },
      ),
    );
    h.clients.analytics.send.mockImplementation((pattern: string) =>
      Promise.resolve(pattern === A.listExpenses ? noExpenses : null),
    );
    h.clients.catalog.send.mockResolvedValue({ [VARIANT]: 200_000 });

    const res = await as(owner)
      .get('/v1/admin/reports/profit-loss?from=2026-10-01&to=2026-10-24')
      .expect(200);
    expect(res.body.revenue.totalPaisa).toBe(720_000);
    expect(res.body.costOfGoods.totalPaisa).toBe(400_000);
    expect(res.body.netProfitPaisa).toBe(320_000);
    expect(h.clients.catalog.send).toHaveBeenCalledWith(
      RPC_PATTERNS.catalog.admin.variantCosts,
      expect.objectContaining({ variantIds: [VARIANT] }),
    );
  });

  it('rejects an inverted range', async () => {
    await as(owner).get('/v1/admin/reports/profit-loss?from=2026-10-24&to=2026-10-01').expect(422);
  });
});
