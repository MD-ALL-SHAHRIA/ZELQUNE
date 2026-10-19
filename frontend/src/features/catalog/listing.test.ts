import { describe, expect, it } from 'vitest';
import { applyListing } from './listing-grid';

const items = [
  { id: 'a', saleMode: 'PRE_ORDER' as const, pricePaisa: 349000 },
  { id: 'b', saleMode: 'MADE_TO_ORDER' as const, pricePaisa: 549000 },
  { id: 'c', saleMode: 'PRE_ORDER' as const, pricePaisa: null },
  { id: 'd', saleMode: 'IN_STOCK' as const, pricePaisa: 129000 },
];
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe('applyListing', () => {
  it('keeps the catalog order for "featured"', () => {
    expect(ids(applyListing(items, 'all', 'featured'))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('filters by availability (sale mode)', () => {
    expect(ids(applyListing(items, 'preOrder', 'featured'))).toEqual(['a', 'c']);
    expect(ids(applyListing(items, 'madeToOrder', 'featured'))).toEqual(['b']);
    expect(ids(applyListing(items, 'inStock', 'featured'))).toEqual(['d']);
  });

  it('sorts by price both ways, unpriced last', () => {
    expect(ids(applyListing(items, 'all', 'priceAsc'))).toEqual(['d', 'a', 'b', 'c']);
    expect(ids(applyListing(items, 'all', 'priceDesc'))).toEqual(['b', 'a', 'd', 'c']);
  });
});
