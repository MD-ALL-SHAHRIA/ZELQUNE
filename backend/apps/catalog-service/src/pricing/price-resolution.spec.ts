import {
  applySale,
  type LiveSale,
  currentBasePrice,
  lowestPrice,
  parseExperimentKey,
  resolvePrice,
} from './price-resolution';

const now = new Date('2026-10-19T12:00:00Z');
const at = (iso: string) => new Date(iso);

const base = [
  {
    amountPaisa: 399000,
    compareAtPaisa: null,
    startsAt: at('2026-01-01T00:00:00Z'),
    endsAt: at('2026-10-01T00:00:00Z'),
  },
  {
    amountPaisa: 349000,
    compareAtPaisa: 399000,
    startsAt: at('2026-10-01T00:00:00Z'),
    endsAt: null,
  },
  { amountPaisa: 299000, compareAtPaisa: null, startsAt: at('2026-12-01T00:00:00Z'), endsAt: null }, // future
];
const experiments = [
  { key: 'a' as const, amountPaisa: 349000, active: true },
  { key: 'b' as const, amountPaisa: 429000, active: true },
];

describe('price resolution', () => {
  it('parses only a/b (case-insensitive)', () => {
    expect(['a', 'B', ' b ', 'c', '', undefined, null, 'ab'].map(parseExperimentKey)).toEqual([
      'a',
      'b',
      'b',
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it('picks the base price in effect now (ignores ended and future prices)', () => {
    expect(currentBasePrice(base, now)?.amountPaisa).toBe(349000);
    expect(currentBasePrice(base, at('2026-06-01T00:00:00Z'))?.amountPaisa).toBe(399000);
    expect(currentBasePrice([], now)).toBeNull();
  });

  it('without ?p returns the base price', () => {
    expect(resolvePrice({ prices: base, experiments, now })).toEqual({
      amountPaisa: 349000,
      compareAtPaisa: 399000,
      currency: 'BDT',
      experimentKey: null,
    });
  });

  it('?p=a -> 349000 and ?p=b -> 429000 tagged with the experiment key', () => {
    expect(resolvePrice({ prices: base, experiments, p: 'a', now })).toMatchObject({
      amountPaisa: 349000,
      experimentKey: 'a',
    });
    expect(resolvePrice({ prices: base, experiments, p: 'b', now })).toMatchObject({
      amountPaisa: 429000,
      experimentKey: 'b',
    });
  });

  it('never shows a compare-at price that is not above the shown price', () => {
    // arm b (429000) is above the base compare-at (399000): no strike-through
    expect(resolvePrice({ prices: base, experiments, p: 'b', now })?.compareAtPaisa).toBeNull();
    expect(resolvePrice({ prices: base, experiments, p: 'a', now })?.compareAtPaisa).toBe(399000);
  });

  it('ignores unknown buckets and inactive arms', () => {
    expect(resolvePrice({ prices: base, experiments, p: 'z', now })?.experimentKey).toBeNull();
    const inactive = experiments.map((e) => ({ ...e, active: e.key !== 'b' }));
    expect(resolvePrice({ prices: base, experiments: inactive, p: 'b', now })).toMatchObject({
      amountPaisa: 349000,
      experimentKey: null,
    });
  });

  it('uses an experiment arm even without a base price, and returns null with neither', () => {
    expect(resolvePrice({ prices: [], experiments, p: 'b', now })?.amountPaisa).toBe(429000);
    expect(resolvePrice({ prices: [], experiments, now })).toBeNull();
  });

  it('lowestPrice skips nulls', () => {
    const a = resolvePrice({ prices: base, experiments, p: 'a', now });
    const b = resolvePrice({ prices: base, experiments, p: 'b', now });
    expect(lowestPrice([b, null, a])?.amountPaisa).toBe(349000);
    expect(lowestPrice([null])).toBeNull();
  });
});

describe('applySale', () => {
  const base = {
    amountPaisa: 349_000,
    compareAtPaisa: null,
    currency: 'BDT' as const,
    experimentKey: null,
  };
  const sale = (over: Partial<LiveSale> = {}): LiveSale => ({
    id: '00000000-0000-4000-8000-000000000001',
    nameEn: 'Eid flash sale',
    nameBn: 'ঈদ ফ্ল্যাশ সেল',
    kind: 'PERCENT',
    value: 15,
    endsAt: new Date('2026-11-01T00:00:00Z'),
    flash: true,
    productIds: null,
    ...over,
  });

  it('takes the best sale off and shows the regular price struck through', () => {
    const price = applySale(base, 'p1', [sale(), sale({ kind: 'FIXED', value: 20_000 })]);
    expect(price?.amountPaisa).toBe(296_600);
    expect(price?.compareAtPaisa).toBe(349_000);
    expect(price?.sale?.regularPaisa).toBe(349_000);
  });

  it('only covers listed products, never goes below ৳1 and skips experiment prices', () => {
    expect(applySale(base, 'p1', [sale({ productIds: new Set(['p2']) })])?.sale).toBeNull();
    expect(applySale(base, 'p1', [sale({ kind: 'FIXED', value: 999_999 })])?.amountPaisa).toBe(100);
    expect(applySale({ ...base, experimentKey: 'a' }, 'p1', [sale()])?.amountPaisa).toBe(349_000);
  });
});
