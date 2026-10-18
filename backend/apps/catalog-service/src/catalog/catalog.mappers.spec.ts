import { type StorageProvider } from '../storage/storage.provider';
import { CatalogMapper } from './catalog.mappers';
import { publicProductInclude, type PublicProductRow } from './catalog.repository';

const now = new Date('2026-10-19T12:00:00Z');
const storage = { publicUrl: (k: string) => `https://cdn.example/${k}` } as StorageProvider;

const variant = (id: string, sku: string, amountPaisa: number) => ({
  id,
  productId: 'p1',
  sku,
  options: { finish: sku.endsWith('WALNUT') ? 'WALNUT' : 'NATURAL', bogus: 42 },
  weightGrams: null,
  widthMm: 320,
  heightMm: 640,
  depthMm: null,
  position: 0,
  isActive: true,
  createdAt: now,
  updatedAt: now,
  prices: [
    {
      id: `${id}-p`,
      variantId: id,
      amountPaisa,
      compareAtPaisa: null,
      startsAt: new Date(0),
      endsAt: null,
      createdAt: now,
    },
  ],
  experiments: [
    {
      id: `${id}-a`,
      variantId: id,
      key: 'a' as const,
      amountPaisa: 349000,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `${id}-b`,
      variantId: id,
      key: 'b' as const,
      amountPaisa: 429000,
      active: true,
      createdAt: now,
      updatedAt: now,
    },
  ],
});

const row = {
  id: 'p1',
  slug: 'alo-arch-panel',
  nameBn: 'আলো-আর্চ প্যানেল',
  nameEn: 'Alo-Arch Panel',
  descriptionBn: null,
  descriptionEn: null,
  saleMode: 'PRE_ORDER',
  leadTimeDays: null,
  status: 'ACTIVE',
  seoTitleBn: null,
  seoTitleEn: null,
  seoDescriptionBn: null,
  seoDescriptionEn: null,
  publishedAt: now,
  createdAt: now,
  updatedAt: now,
  variants: [variant('v1', 'ALO-ARCH-WALNUT', 349000), variant('v2', 'ALO-ARCH-NATURAL', 359000)],
  media: [
    {
      id: 'm2',
      productId: 'p1',
      variantId: 'v1',
      storageKey: 'media/m2.webp',
      mimeType: 'image/webp',
      bytes: 1,
      altBn: null,
      altEn: null,
      position: 0,
      status: 'READY',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'm1',
      productId: 'p1',
      variantId: null,
      storageKey: 'media/m1.webp',
      mimeType: 'image/webp',
      bytes: 1,
      altBn: 'আলো',
      altEn: 'Light',
      position: 1,
      status: 'READY',
      createdAt: now,
      updatedAt: now,
    },
  ],
  categories: [],
} as unknown as PublicProductRow;

describe('public catalog read model', () => {
  it('only loads active variants, current prices, active experiments and READY media', () => {
    const include = publicProductInclude(now);
    expect(include.variants.where).toEqual({ isActive: true });
    expect(include.media.where).toEqual({ status: 'READY' });
    expect(include.variants.include.experiments.where).toEqual({ active: true });
    expect(include.variants.include.prices.where).toEqual({
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    });
  });

  it('maps summary: lowest price as fromPrice, product-level image as primary media', () => {
    const summary = new CatalogMapper(storage).summary(row, undefined, now);
    expect(summary.fromPrice).toMatchObject({ amountPaisa: 349000, experimentKey: null });
    expect(summary.primaryMedia).toMatchObject({
      id: 'm1',
      url: 'https://cdn.example/media/m1.webp',
    });
  });

  it('maps detail with experiment prices and string-only options', () => {
    const detail = new CatalogMapper(storage).detail(row, 'b', now);
    expect(detail.variants.map((v) => v.price?.amountPaisa)).toEqual([429000, 429000]);
    expect(detail.variants[0].options).toEqual({ finish: 'WALNUT' });
    expect(detail.variants[0].dimensions).toEqual({ widthMm: 320, heightMm: 640, depthMm: null });
    expect(detail.media.map((m) => m.id)).toEqual(['m2', 'm1']);
  });
});
