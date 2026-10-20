import { QUOTE_STATUSES } from '@zelqune/contracts';
import {
  assertDiscountsAllowed,
  assertProductQuote,
  canTransitionQuote,
  conversionPayment,
  discountPercent,
} from './quote-rules';

const OWNER = { id: 'o', role: 'OWNER' as const };
const STAFF = { id: 's', role: 'STAFF' as const };

describe('quote state machine', () => {
  const allowed = new Set([
    'NEW>QUOTED',
    'NEW>REJECTED',
    'NEW>EXPIRED',
    'QUOTED>QUOTED',
    'QUOTED>ACCEPTED',
    'QUOTED>REJECTED',
    'QUOTED>EXPIRED',
    'ACCEPTED>REJECTED',
    'ACCEPTED>EXPIRED',
  ]);
  it('allows exactly the documented transitions', () => {
    for (const from of QUOTE_STATUSES)
      for (const to of QUOTE_STATUSES) {
        expect([from, to, canTransitionQuote(from, to)]).toEqual([
          from,
          to,
          allowed.has(`${from}>${to}`),
        ]);
      }
  });
});

describe('B2B discount guard', () => {
  const line = (unitPricePaisa: number) => [
    { lineId: 'l1', sku: 'ALO-ARCH-WALNUT', retailPricePaisa: 349000, unitPricePaisa },
  ];

  it('computes the discount below retail', () => {
    expect(discountPercent(349000, 279200)).toBe(20);
    expect(discountPercent(349000, 261750)).toBe(25);
    expect(discountPercent(349000, 400000)).toBe(-14.61);
  });

  it('up to 20% below retail is fine for anyone', () => {
    expect(() => assertDiscountsAllowed(line(279200), 20, STAFF, false)).not.toThrow();
  });

  it('deeper discounts: STAFF refused, OWNER only with allowDeepDiscount', () => {
    expect(() => assertDiscountsAllowed(line(261750), 20, STAFF, true)).toThrow(
      expect.objectContaining({ code: 'DISCOUNT_TOO_DEEP', status: 422 }) as Error,
    );
    expect(() => assertDiscountsAllowed(line(261750), 20, OWNER, false)).toThrow(
      expect.objectContaining({ code: 'DISCOUNT_TOO_DEEP' }) as Error,
    );
    expect(() => assertDiscountsAllowed(line(261750), 20, OWNER, true)).not.toThrow();
  });

  it('lines without a retail reference are not guarded', () => {
    expect(() =>
      assertDiscountsAllowed(
        [{ lineId: 'l', sku: 'X', retailPricePaisa: null, unitPricePaisa: 1 }],
        20,
        STAFF,
        false,
      ),
    ).not.toThrow();
  });
});

describe('quote conversion payment', () => {
  it('advance > 0 is paid via bKash/Nagad as ADVANCE', () => {
    expect(conversionPayment('BKASH_MANUAL', 500000, 5000000, STAFF)).toEqual({
      kind: 'ADVANCE',
      amountPaisa: 500000,
    });
    expect(() => conversionPayment('COD', 500000, 5000000, OWNER)).toThrow(
      expect.objectContaining({ code: 'ADVANCE_REQUIRED' }) as Error,
    );
  });

  it('advance = 0 (COD) is OWNER only; STAFF gets 422', () => {
    expect(conversionPayment('COD', 0, 5000000, OWNER)).toEqual({
      kind: 'COD',
      amountPaisa: 5000000,
    });
    expect(() => conversionPayment('COD', 0, 5000000, STAFF)).toThrow(
      expect.objectContaining({ code: 'COD_CONVERSION_OWNER_ONLY', status: 422 }) as Error,
    );
    expect(() => conversionPayment('BKASH_MANUAL', 0, 5000000, OWNER)).toThrow(
      expect.objectContaining({ code: 'INVALID_PAYMENT_METHOD' }) as Error,
    );
  });
});

describe('assertProductQuote', () => {
  it('lets product quotes through and refuses design consultations', () => {
    expect(() => assertProductQuote('PRODUCT')).not.toThrow();
    expect(() => assertProductQuote('CONSTRUCTION')).toThrow(
      expect.objectContaining({ code: 'DESIGN_REQUEST_NOT_PRICEABLE' }),
    );
    expect(() => assertProductQuote('DESIGN')).toThrow(
      expect.objectContaining({ code: 'DESIGN_REQUEST_NOT_PRICEABLE', status: 422 }),
    );
  });
});
