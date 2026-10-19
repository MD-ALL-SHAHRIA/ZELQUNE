import { type VariantCheckoutSnapshot } from '@zelqune/contracts';
import { priceCart } from './cart-pricing';

const snap = (
  id: string,
  saleMode: VariantCheckoutSnapshot['saleMode'],
  amount: number | null,
): VariantCheckoutSnapshot => ({
  variantId: id,
  productId: id,
  productSlug: 'p',
  sku: `SKU-${id}`,
  nameBn: 'ক',
  nameEn: 'A',
  options: { finish: 'WALNUT' },
  saleMode,
  leadTimeDays: null,
  packageWeightGrams: null,
  packageLengthMm: null,
  packageWidthMm: null,
  packageHeightMm: null,
  price:
    amount === null
      ? null
      : { amountPaisa: amount, compareAtPaisa: null, currency: 'BDT', experimentKey: null },
});

describe('priceCart', () => {
  it('prices lines and detects a single sale mode', () => {
    const cart = priceCart([{ variantId: 'a', qty: 2 }], { a: snap('a', 'PRE_ORDER', 349000) });
    expect(cart).toMatchObject({
      subtotalPaisa: 698000,
      saleMode: 'PRE_ORDER',
      mixedSaleModes: false,
      allAvailable: true,
    });
    expect(cart.items[0]).toMatchObject({ lineTotalPaisa: 698000, available: true, sku: 'SKU-a' });
  });

  it('flags mixed sale modes', () => {
    const cart = priceCart(
      [
        { variantId: 'a', qty: 1 },
        { variantId: 'b', qty: 1 },
      ],
      { a: snap('a', 'PRE_ORDER', 1), b: snap('b', 'IN_STOCK', 1) },
    );
    expect(cart).toMatchObject({ saleMode: null, mixedSaleModes: true });
  });

  it('marks unsellable and unpriced variants unavailable and leaves them out of the subtotal', () => {
    const cart = priceCart(
      [
        { variantId: 'gone', qty: 1 },
        { variantId: 'free', qty: 1 },
        { variantId: 'ok', qty: 1 },
      ],
      { free: snap('free', 'IN_STOCK', null), ok: snap('ok', 'IN_STOCK', 100) },
    );
    expect(cart.items.map((i) => i.available)).toEqual([false, false, true]);
    expect(cart).toMatchObject({ subtotalPaisa: 100, allAvailable: false });
  });
});
