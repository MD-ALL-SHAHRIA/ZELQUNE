import { AppError } from '@zelqune/common';
import { applyCoupon, couponDiscount, couponProblem, type CouponRule } from './coupon';

const now = new Date('2026-10-24T12:00:00Z');
const rule = (over: Partial<CouponRule> = {}): CouponRule => ({
  code: 'EID10',
  kind: 'PERCENT',
  value: 10,
  minSubtotalPaisa: 0,
  maxDiscountPaisa: null,
  startsAt: null,
  endsAt: null,
  maxUses: null,
  usedCount: 0,
  active: true,
  ...over,
});

describe('coupons', () => {
  it('takes a percentage off, rounded down to a whole taka', () => {
    expect(couponDiscount(rule(), 349_050)).toBe(34_900);
  });

  it('caps a percentage at maxDiscount and a fixed amount at the subtotal', () => {
    expect(couponDiscount(rule({ maxDiscountPaisa: 20_000 }), 500_000)).toBe(20_000);
    expect(couponDiscount(rule({ kind: 'FIXED', value: 900_000 }), 500_000)).toBe(500_000);
  });

  it('reports why a code cannot be used', () => {
    expect(couponProblem(null, 1, now)).toBe('NOT_FOUND');
    expect(couponProblem(rule({ active: false }), 1, now)).toBe('INACTIVE');
    expect(couponProblem(rule({ startsAt: new Date('2026-11-01') }), 1, now)).toBe('NOT_STARTED');
    expect(couponProblem(rule({ endsAt: now }), 1, now)).toBe('EXPIRED');
    expect(couponProblem(rule({ maxUses: 5, usedCount: 5 }), 1, now)).toBe('USED_UP');
    expect(couponProblem(rule({ minSubtotalPaisa: 100_000 }), 99_999, now)).toBe('MIN_SUBTOTAL');
    expect(couponProblem(rule(), 1, now)).toBeNull();
  });

  it('throws COUPON_INVALID with the reason', () => {
    expect.assertions(2);
    try {
      applyCoupon(rule({ endsAt: now }), 100_000, now);
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).details).toEqual({ reason: 'EXPIRED' });
    }
  });
});
