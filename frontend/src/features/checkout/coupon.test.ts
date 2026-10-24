import { describe, expect, it } from 'vitest';
import { en } from '@/i18n/dictionaries/en';
import { couponProblem, normalizeCoupon } from './coupon';

const reasons = en.offers.coupon.reasons;
const refused = (details: object) => ({
  status: 422,
  data: { error: { code: 'COUPON_INVALID', message: 'x', details } },
});

describe('coupon', () => {
  it('explains why a code was refused', () => {
    expect(couponProblem(refused({ reason: 'EXPIRED' }), reasons, 'en')).toBe(reasons.EXPIRED);
    expect(
      couponProblem(refused({ reason: 'MIN_SUBTOTAL', minSubtotalPaisa: 500_000 }), reasons, 'en'),
    ).toBe('Your order needs to be at least ৳5,000 for this code.');
    expect(
      couponProblem({ status: 409, data: { error: { code: 'X' } } }, reasons, 'en'),
    ).toBeNull();
  });

  it('normalizes what customers type', () => {
    expect(normalizeCoupon(' welcome 10 ')).toBe('WELCOME10');
  });
});
