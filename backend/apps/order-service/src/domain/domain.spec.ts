import { ORDER_CODE_PATTERN, ORDER_STATUSES } from '@zelqune/contracts';
import { generateOrderCode } from './order-code';
import { canTransitionOrder } from './order-state';
import { allowedPaymentMethods, computeTotals, paymentPlan } from './pricing';

describe('order codes', () => {
  it('are ZQ- + 6 unambiguous characters and not sequential', () => {
    const codes = Array.from({ length: 2000 }, () => generateOrderCode());
    expect(codes.every((c) => ORDER_CODE_PATTERN.test(c))).toBe(true);
    expect(codes.join('')).not.toMatch(/[01OIL]/);
    expect(new Set(codes).size).toBeGreaterThan(1990);
  });

  it('uses the injected randomness (deterministic in tests)', () => {
    expect(generateOrderCode(() => 0)).toBe('ZQ-222222');
  });
});

describe('order state machine', () => {
  const allowed = new Set([
    'PENDING_PAYMENT>CONFIRMED',
    'PENDING_PAYMENT>CANCELLED',
    'CONFIRMED>IN_PRODUCTION',
    'CONFIRMED>READY_TO_SHIP',
    'CONFIRMED>CANCELLED',
    'IN_PRODUCTION>READY_TO_SHIP',
    'IN_PRODUCTION>CANCELLED',
    'READY_TO_SHIP>SHIPPED',
    'READY_TO_SHIP>CANCELLED',
    'SHIPPED>DELIVERED',
    'SHIPPED>RETURNED',
    'DELIVERED>RETURN_REQUESTED',
    'RETURN_REQUESTED>RETURNED',
    'RETURN_REQUESTED>DELIVERED',
    'RETURNED>REFUNDED',
    'CANCELLED>REFUNDED',
  ]);

  it('allows exactly the documented transitions (pre-order)', () => {
    for (const from of ORDER_STATUSES) {
      for (const to of ORDER_STATUSES) {
        expect([from, to, canTransitionOrder(from, to, 'PRE_ORDER')]).toEqual([
          from,
          to,
          allowed.has(`${from}>${to}`),
        ]);
      }
    }
  });

  it('IN_PRODUCTION only for made-to-order and pre-order', () => {
    expect(canTransitionOrder('CONFIRMED', 'IN_PRODUCTION', 'IN_STOCK')).toBe(false);
    expect(canTransitionOrder('CONFIRMED', 'IN_PRODUCTION', 'MADE_TO_ORDER')).toBe(true);
    expect(canTransitionOrder('CONFIRMED', 'READY_TO_SHIP', 'IN_STOCK')).toBe(true);
  });
});

describe('totals and advance', () => {
  const fixed = { mode: 'fixed' as const, fixedPaisa: 30000 };
  const line = { unitPricePaisa: 349000, qty: 1 };

  it('IN_STOCK has no advance', () => {
    expect(
      computeTotals({
        lines: [line],
        shippingFeePaisa: 17000,
        saleMode: 'IN_STOCK',
        advance: fixed,
      }),
    ).toEqual({
      subtotalPaisa: 349000,
      discountPaisa: 0,
      shippingFeePaisa: 17000,
      totalPaisa: 366000,
      advanceRequiredPaisa: 0,
    });
  });

  it('PRE_ORDER and MADE_TO_ORDER: fixed ৳300 advance per order', () => {
    for (const saleMode of ['PRE_ORDER', 'MADE_TO_ORDER'] as const) {
      expect(
        computeTotals({
          lines: [{ ...line, qty: 3 }],
          shippingFeePaisa: 17000,
          saleMode,
          advance: fixed,
        }).advanceRequiredPaisa,
      ).toBe(30000);
    }
  });

  it('fixed advance is capped at the order total', () => {
    const cheap = computeTotals({
      lines: [{ unitPricePaisa: 15000, qty: 1 }],
      shippingFeePaisa: 7000,
      saleMode: 'PRE_ORDER',
      advance: fixed,
    });
    expect(cheap.totalPaisa).toBe(22000);
    expect(cheap.advanceRequiredPaisa).toBe(22000);
  });

  it('percent mode rounds up to a whole taka of the subtotal', () => {
    const t = computeTotals({
      lines: [{ unitPricePaisa: 349050, qty: 1 }],
      shippingFeePaisa: 0,
      saleMode: 'PRE_ORDER',
      advance: { mode: 'percent', percent: 10 },
    });
    expect(t.advanceRequiredPaisa).toBe(34905 + 95); // 349.05 taka -> 350 taka
  });
});

describe('payment rules', () => {
  const both = {
    bkash: { number: '01711111111', accountType: 'personal' },
    nagad: { number: '01811111111', accountType: 'personal' },
  };
  const totals = {
    subtotalPaisa: 349000,
    discountPaisa: 0,
    shippingFeePaisa: 17000,
    totalPaisa: 366000,
    advanceRequiredPaisa: 30000,
  };

  it('offers COD only for IN_STOCK and manual methods only when configured', () => {
    expect(allowedPaymentMethods('IN_STOCK', both)).toEqual([
      'COD',
      'BKASH_MANUAL',
      'NAGAD_MANUAL',
    ]);
    expect(allowedPaymentMethods('PRE_ORDER', both)).toEqual(['BKASH_MANUAL', 'NAGAD_MANUAL']);
    expect(allowedPaymentMethods('PRE_ORDER', { ...both, nagad: null })).toEqual(['BKASH_MANUAL']);
  });

  it('charges the advance for pre-orders, the total otherwise', () => {
    const allowed = allowedPaymentMethods('PRE_ORDER', both);
    expect(paymentPlan('PRE_ORDER', 'BKASH_MANUAL', totals, allowed)).toEqual({
      kind: 'ADVANCE',
      amountPaisa: 30000,
    });
    expect(paymentPlan('IN_STOCK', 'COD', { ...totals, advanceRequiredPaisa: 0 }, ['COD'])).toEqual(
      { kind: 'COD', amountPaisa: 366000 },
    );
    expect(paymentPlan('IN_STOCK', 'NAGAD_MANUAL', totals, ['COD', 'NAGAD_MANUAL'])).toEqual({
      kind: 'FULL',
      amountPaisa: 366000,
    });
  });

  it('rejects COD for pre-orders and unconfigured methods', () => {
    expect(() => paymentPlan('PRE_ORDER', 'COD', totals, ['BKASH_MANUAL'])).toThrow(
      expect.objectContaining({ code: 'ADVANCE_REQUIRED', status: 422 }) as Error,
    );
    expect(() => paymentPlan('IN_STOCK', 'NAGAD_MANUAL', totals, ['COD'])).toThrow(
      expect.objectContaining({ code: 'PAYMENT_METHOD_UNAVAILABLE' }) as Error,
    );
  });
});
