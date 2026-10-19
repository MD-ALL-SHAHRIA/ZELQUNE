import { AppError } from '@zelqune/common';
import { type ProductDetail } from '@zelqune/contracts';
import request from 'supertest';
import { createGatewayHarness, type GatewayHarness } from './helpers';

const detail: ProductDetail = {
  id: '0b6f0a3e-7f2a-4c35-9a5e-2f1d0c1b2a3e',
  slug: 'alo-arch-panel',
  nameBn: 'আলো-আর্চ প্যানেল',
  nameEn: 'Alo-Arch Panel',
  saleMode: 'PRE_ORDER',
  leadTimeDays: null,
  fromPrice: { amountPaisa: 429000, compareAtPaisa: null, currency: 'BDT', experimentKey: 'b' },
  primaryMedia: null,
  descriptionBn: null,
  descriptionEn: null,
  seo: { titleBn: null, titleEn: null, descriptionBn: null, descriptionEn: null },
  categories: [],
  variants: [],
  media: [],
};

describe('public catalog routes (e2e, catalog mocked)', () => {
  let h: GatewayHarness;
  beforeAll(async () => {
    h = await createGatewayHarness();
  });
  afterAll(async () => {
    await h.app.close();
  });
  beforeEach(() => h.clients.catalog.send.mockReset());

  it('are public and pass validated, defaulted query params', async () => {
    h.clients.catalog.send.mockResolvedValueOnce({ items: [], page: 2, limit: 10, total: 0 });
    await request(h.app.getHttpServer())
      .get('/v1/catalog/products?page=2&limit=10&p=b&saleMode=PRE_ORDER')
      .expect(200);
    expect(h.clients.catalog.send).toHaveBeenCalledWith('catalog.products.list', {
      page: 2,
      limit: 10,
      p: 'b',
      saleMode: 'PRE_ORDER',
    });
  });

  it('rejects invalid query params with 400', async () => {
    const res = await request(h.app.getHttpServer())
      .get('/v1/catalog/products?limit=500')
      .expect(400);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    await request(h.app.getHttpServer()).get('/v1/catalog/products?saleMode=SOON').expect(400);
    expect(h.clients.catalog.send).not.toHaveBeenCalled();
  });

  it('GET /products/:slug forwards slug and p; maps PRODUCT_NOT_FOUND to 404', async () => {
    h.clients.catalog.send.mockResolvedValueOnce(detail);
    const res = await request(h.app.getHttpServer())
      .get('/v1/catalog/products/alo-arch-panel?p=b')
      .expect(200);
    expect(res.body.fromPrice).toMatchObject({ amountPaisa: 429000, experimentKey: 'b' });
    expect(h.clients.catalog.send).toHaveBeenCalledWith('catalog.products.bySlug', {
      slug: 'alo-arch-panel',
      p: 'b',
    });

    h.clients.catalog.send.mockRejectedValueOnce(
      new AppError('PRODUCT_NOT_FOUND', 'Product not found', 404),
    );
    const missing = await request(h.app.getHttpServer())
      .get('/v1/catalog/products/nope')
      .expect(404);
    expect(missing.body.error.code).toBe('PRODUCT_NOT_FOUND');
    await request(h.app.getHttpServer()).get('/v1/catalog/products/Bad_Slug').expect(400);
  });

  it('a response that breaks its schema is a 500, never leaked', async () => {
    h.clients.catalog.send.mockResolvedValueOnce({ ...detail, fromPrice: { amountPaisa: 1.5 } });
    const res = await request(h.app.getHttpServer())
      .get('/v1/catalog/products/alo-arch-panel')
      .expect(500);
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
