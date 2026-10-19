import { priceChanged, productPublished, productUpdated } from './catalog.events';

const productId = '0b6f0a3e-7f2a-4c35-9a5e-2f1d0c1b2a3e';
const variantId = '1c7e1b4f-8a3b-4d46-8b6f-3a2e1d2c3b4f';
const meta = { source: 'catalog-service', requestId: 'req-1' };

describe('catalog event contracts (v1)', () => {
  it('product.published', () => {
    const e = productPublished.create(
      {
        productId,
        slug: 'alo-arch-panel',
        saleMode: 'PRE_ORDER',
        publishedAt: new Date().toISOString(),
      },
      meta,
    );
    expect(e).toMatchObject({ type: 'product.published', version: 1 });
    expect(() =>
      productPublished.create(
        { productId, slug: 'x', saleMode: 'SOON', publishedAt: 'x' } as never,
        meta,
      ),
    ).toThrow();
  });

  it('product.updated requires at least one changed field', () => {
    expect(
      productUpdated.create(
        { productId, slug: 's', status: 'ACTIVE', changedFields: ['nameBn'] },
        meta,
      ).payload.changedFields,
    ).toEqual(['nameBn']);
    expect(() =>
      productUpdated.create({ productId, slug: 's', status: 'ACTIVE', changedFields: [] }, meta),
    ).toThrow();
  });

  it('price.changed carries integer paisa and the experiment key', () => {
    const e = priceChanged.create(
      {
        productId,
        variantId,
        amountPaisa: 429000,
        compareAtPaisa: null,
        previousAmountPaisa: 349000,
        experimentKey: 'b',
      },
      meta,
    );
    expect(e.payload).toMatchObject({ amountPaisa: 429000, experimentKey: 'b' });
    expect(() =>
      priceChanged.create(
        {
          productId,
          variantId,
          amountPaisa: 3490.5,
          compareAtPaisa: null,
          previousAmountPaisa: null,
          experimentKey: null,
        },
        meta,
      ),
    ).toThrow();
  });
});
