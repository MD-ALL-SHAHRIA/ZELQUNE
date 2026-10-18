import { type EventEnvelope } from '@zelqune/contracts';
import { type OutboxService, requestContext } from '@zelqune/common';
import { type PrismaService } from '../prisma/prisma.service';
import { type StorageProvider } from '../storage/storage.provider';
import { CatalogAdminService } from './catalog-admin.service';
import { changedFields, sameOptions } from './changed-fields';

const productId = '0b6f0a3e-7f2a-4c35-9a5e-2f1d0c1b2a3e';
const variantId = '1c7e1b4f-8a3b-4d46-8b6f-3a2e1d2c3b4f';
const mediaId = '2d8f2c5a-9b4c-4e57-8c7a-4b3f2e3d4c5a';

function setup(state: {
  product?: Record<string, unknown>;
  currentPrice?: { amountPaisa: number; compareAtPaisa: number | null } | null;
  experiment?: { amountPaisa: number; active: boolean } | null;
  sellableVariants?: number;
  media?: Record<string, unknown>;
}) {
  const product = {
    id: productId,
    slug: 'alo-arch-panel',
    status: 'DRAFT',
    saleMode: 'PRE_ORDER',
    publishedAt: null,
    ...state.product,
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    $executeRaw: jest.fn().mockResolvedValue(1),
    product: {
      findUnique: jest.fn().mockResolvedValue(product),
      update: jest.fn().mockResolvedValue(product),
    },
    productVariant: {
      findUnique: jest.fn().mockResolvedValue({ id: variantId, productId }),
      count: jest.fn().mockResolvedValue(state.sellableVariants ?? 1),
    },
    price: {
      findFirst: jest.fn().mockResolvedValue(state.currentPrice ?? null),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      create: jest.fn().mockResolvedValue({}),
    },
    priceExperiment: {
      findUnique: jest.fn().mockResolvedValue(state.experiment ?? null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    media: {
      findUnique: jest.fn().mockResolvedValue({
        id: mediaId,
        productId,
        storageKey: `media/${mediaId}.webp`,
        bytes: 10,
        mimeType: 'image/webp',
        status: 'PENDING',
        ...state.media,
      }),
      update: jest.fn().mockResolvedValue({}),
    },
  };
  const prisma = {
    ...tx,
    $transaction: (fn: (t: typeof tx) => unknown) => fn(tx),
  } as unknown as PrismaService;
  const events: EventEnvelope[] = [];
  const outbox = {
    add: jest.fn((_tx: unknown, e: EventEnvelope) => (events.push(e), Promise.resolve())),
  } as unknown as OutboxService;
  const storage = {
    head: jest.fn().mockResolvedValue({ bytes: 10, contentType: 'image/webp' }),
  } as unknown as StorageProvider;
  return { service: new CatalogAdminService(prisma, outbox, storage), tx, events, outbox, storage };
}

describe('sameOptions', () => {
  it('ignores key order and detects value/key changes', () => {
    expect(sameOptions({ size: 'L', finish: 'WALNUT' }, { finish: 'WALNUT', size: 'L' })).toBe(
      true,
    );
    expect(sameOptions({ finish: 'WALNUT' }, { finish: 'NATURAL' })).toBe(false);
    expect(sameOptions({ finish: 'WALNUT' }, {})).toBe(false);
    expect(sameOptions(null, {})).toBe(true);
  });
});

describe('changedFields', () => {
  it('reports only real changes; arrays compared as sets', () => {
    expect(
      changedFields({ a: 1, b: 'x', ids: ['1', '2'] }, { a: 1, b: 'y', ids: ['2', '1'] }),
    ).toEqual(['b']);
    expect(changedFields({ a: 1 }, { a: undefined })).toEqual([]);
  });
});

describe('CatalogAdminService events', () => {
  it('publish: DRAFT -> ACTIVE emits product.published inside the transaction', async () => {
    const { service, tx, events, outbox } = setup({});
    await requestContext.run({ requestId: 'req-pub' }, () => service.publishProduct({ productId }));
    expect(tx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'ACTIVE' }) }),
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'product.published',
      source: 'catalog-service',
      requestId: 'req-pub',
      payload: { productId, saleMode: 'PRE_ORDER' },
    });
    // written with the transaction client, not the root client
    expect((outbox.add as jest.Mock).mock.calls[0][0]).toBe(tx);
  });

  it('publish is idempotent and refuses products without a priced active variant', async () => {
    const active = setup({ product: { status: 'ACTIVE' } });
    await active.service.publishProduct({ productId });
    expect(active.events).toHaveLength(0);

    const unpriced = setup({ sellableVariants: 0 });
    await expect(unpriced.service.publishProduct({ productId })).rejects.toMatchObject({
      code: 'PRODUCT_NOT_PUBLISHABLE',
      status: 409,
    });
    expect(unpriced.events).toHaveLength(0);
  });

  it('base price change closes the old price and emits price.changed with the previous amount', async () => {
    const { service, tx, events } = setup({
      currentPrice: { amountPaisa: 349000, compareAtPaisa: null },
    });
    await expect(service.setBasePrice({ variantId, amountPaisa: 399000 })).resolves.toEqual({
      changed: true,
    });
    expect(tx.price.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { endsAt: expect.any(Date) } }),
    );
    expect(events[0]).toMatchObject({
      type: 'price.changed',
      payload: {
        variantId,
        productId,
        amountPaisa: 399000,
        previousAmountPaisa: 349000,
        experimentKey: null,
      },
    });
  });

  it('unchanged base price is a no-op (no event)', async () => {
    const { service, tx, events } = setup({
      currentPrice: { amountPaisa: 349000, compareAtPaisa: null },
    });
    await expect(service.setBasePrice({ variantId, amountPaisa: 349000 })).resolves.toEqual({
      changed: false,
    });
    expect(tx.price.create).not.toHaveBeenCalled();
    expect(events).toHaveLength(0);
  });

  it('rejects non-integer paisa and compare-at not above the price', async () => {
    const { service } = setup({});
    await expect(service.setBasePrice({ variantId, amountPaisa: 3490.5 })).rejects.toThrow();
    await expect(
      service.setBasePrice({ variantId, amountPaisa: 349000, compareAtPaisa: 349000 }),
    ).rejects.toThrow();
  });

  it('experiment price emits price.changed tagged with the experiment key', async () => {
    const { service, events } = setup({ experiment: { amountPaisa: 399000, active: true } });
    await service.setExperimentPrice({ variantId, key: 'b', amountPaisa: 429000 });
    expect(events[0].payload).toMatchObject({
      amountPaisa: 429000,
      previousAmountPaisa: 399000,
      experimentKey: 'b',
    });
  });

  it('confirming media marks it READY only if the stored object matches; emits product.updated when ACTIVE', async () => {
    const ok = setup({ product: { status: 'ACTIVE' } });
    await expect(ok.service.confirmMediaUpload({ mediaId })).resolves.toEqual({
      id: mediaId,
      status: 'READY',
    });
    expect(ok.events[0]).toMatchObject({
      type: 'product.updated',
      payload: { changedFields: ['media'] },
    });

    const mismatch = setup({});
    (mismatch.storage.head as jest.Mock).mockResolvedValueOnce({
      bytes: 11,
      contentType: 'image/webp',
    });
    await expect(mismatch.service.confirmMediaUpload({ mediaId })).rejects.toMatchObject({
      code: 'MEDIA_NOT_UPLOADED',
    });
    expect(mismatch.tx.media.update).not.toHaveBeenCalled();
  });
});
