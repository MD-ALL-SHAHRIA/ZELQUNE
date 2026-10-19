import { describe, expect, it } from 'vitest';
import { type ProductDetail } from '@/shared/api/types';
import { jsonForScript, productJsonLd } from './json-ld';

const product = {
  saleMode: 'PRE_ORDER',
  media: [],
  variants: [{ sku: 'ALO-ARCH-WALNUT', price: { amountPaisa: 349000 } }],
} as unknown as ProductDetail;

describe('productJsonLd', () => {
  it('marks pre-orders as PreOrder with the price in taka', () => {
    const ld = productJsonLd(product, 'Alo-Arch Panel', 'd', 'https://x/en/products/a');
    expect(ld.offers[0]).toMatchObject({
      price: '3490.00',
      priceCurrency: 'BDT',
      availability: 'https://schema.org/PreOrder',
    });
  });

  it('escapes < so the script tag cannot be closed', () => {
    expect(jsonForScript({ a: '</script>' })).toBe('{"a":"\\u003c/script>"}');
  });
});
