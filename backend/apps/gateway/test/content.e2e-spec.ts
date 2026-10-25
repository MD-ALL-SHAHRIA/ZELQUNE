import { RPC_PATTERNS } from '@zelqune/contracts';
import request from 'supertest';
import { createGatewayHarness, type GatewayHarness } from './helpers';

const ADMIN_ID = '9d1f6c2e-3b4a-4c5d-8e7f-6a5b4c3d2e1f';
const ASSET_ID = '3e9a3d6b-0c5d-4f68-9d8b-5c4a3f4e5d6b';
const l = (en: string) => ({ en, bn: en });
const content = {
  announcement: l('Pre-orders are open'),
  hero: {
    eyebrow: l('Sculptural wall decor'),
    heading: l('Handcrafted wood and gentle light'),
    accent: l('quiet story.'),
    subline: l('Made to order in Dhaka.'),
    scenes: [{ assetId: null, productSlug: 'fluted-niche-panel' }],
  },
  trust: [
    { icon: 'hammer', title: l('Handcrafted'), text: l('Made after you order') },
    { icon: 'truck', title: l('Across Bangladesh'), text: l('All 64 districts') },
  ],
  collections: [{ categorySlug: 'shelves', assetId: null }],
  contact: {},
};

describe('content routes (e2e, services mocked)', () => {
  let h: GatewayHarness;
  let staff: string;
  let customer: string;

  beforeAll(async () => {
    h = await createGatewayHarness();
    staff = await h.signAccessToken({ sub: ADMIN_ID, role: 'STAFF' });
    customer = await h.signAccessToken({ sub: ADMIN_ID, role: 'CUSTOMER' });
  });
  afterAll(async () => {
    await h.app.close();
  });
  beforeEach(() => {
    for (const c of Object.values(h.clients)) c.send.mockReset();
  });

  it('home content is public and null before the first save', async () => {
    h.clients.catalog.send.mockResolvedValue({ home: null });
    const res = await request(h.app.getHttpServer()).get('/v1/content/home').expect(200);
    expect(res.body).toEqual({ home: null });
    expect(h.clients.catalog.send).toHaveBeenCalledWith(
      RPC_PATTERNS.catalog.contentHome,
      expect.anything(),
    );
  });

  it('saving needs OWNER/STAFF and a valid document', async () => {
    const put = (token?: string, body: unknown = { expectedVersion: 0, content }) => {
      const r = request(h.app.getHttpServer())
        .put('/v1/admin/content/home')
        .send(body as object);
      return token ? r.set('Authorization', `Bearer ${token}`) : r;
    };
    await put().expect(401);
    await put(customer).expect(403);
    await put(staff, { expectedVersion: 0, content: { ...content, trust: [] } }).expect(400);

    h.clients.catalog.send.mockResolvedValue({
      version: 1,
      updatedAt: '2026-10-24T00:00:00.000Z',
    });
    const res = await put(staff).expect(200);
    expect(res.body.version).toBe(1);
  });

  it('image upload: ticket, then confirm', async () => {
    const post = (path: string, body: object = {}) =>
      request(h.app.getHttpServer()).post(path).set('Authorization', `Bearer ${staff}`).send(body);
    await post('/v1/admin/content/assets/uploads', { mimeType: 'image/gif', bytes: 10 }).expect(
      400,
    );
    h.clients.catalog.send.mockResolvedValueOnce({
      assetId: ASSET_ID,
      uploadUrl: 'https://upload.test/x',
      method: 'PUT',
      headers: {},
      expiresAt: '2026-10-24T01:00:00.000Z',
    });
    await post('/v1/admin/content/assets/uploads', { mimeType: 'image/webp', bytes: 10 }).expect(
      201,
    );
    h.clients.catalog.send.mockResolvedValueOnce({
      id: ASSET_ID,
      url: 'https://media.test/content/x.webp',
      status: 'READY',
    });
    const res = await post(`/v1/admin/content/assets/${ASSET_ID}/confirm`).expect(200);
    expect(res.body.status).toBe('READY');
  });
});
