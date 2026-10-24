import { AppError } from '@zelqune/common';
import { type CouponKind, type COUPON_PROBLEMS } from '@zelqune/contracts';

export interface CouponRule {
  code: string;
  kind: CouponKind;
  value: number;
  minSubtotalPaisa: number;
  maxDiscountPaisa: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
}

type Problem = (typeof COUPON_PROBLEMS)[number];

const MESSAGES: Record<Problem, string> = {
  NOT_FOUND: 'This code is not valid',
  INACTIVE: 'This code is no longer active',
  NOT_STARTED: 'This code is not active yet',
  EXPIRED: 'This code has expired',
  USED_UP: 'This code has been fully used',
  MIN_SUBTOTAL: 'Your order is below the minimum for this code',
};

/** Why a coupon cannot be used now, or null when it can. */
export function couponProblem(
  coupon: CouponRule | null,
  subtotalPaisa: number,
  now: Date,
): Problem | null {
  if (!coupon) return 'NOT_FOUND';
  if (!coupon.active) return 'INACTIVE';
  if (coupon.startsAt && coupon.startsAt > now) return 'NOT_STARTED';
  if (coupon.endsAt && coupon.endsAt <= now) return 'EXPIRED';
  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) return 'USED_UP';
  if (subtotalPaisa < coupon.minSubtotalPaisa) return 'MIN_SUBTOTAL';
  return null;
}

/**
 * Discount on the product subtotal: PERCENT rounds up to a whole taka (in the customer's favour) and respects the cap;
 * FIXED is the amount. Never more than the subtotal (shipping is never discounted).
 */
export function couponDiscount(coupon: CouponRule, subtotalPaisa: number): number {
  let discount =
    coupon.kind === 'PERCENT'
      ? Math.ceil((subtotalPaisa * coupon.value) / 100 / 100) * 100
      : coupon.value;
  if (coupon.kind === 'PERCENT' && coupon.maxDiscountPaisa !== null)
    discount = Math.min(discount, coupon.maxDiscountPaisa);
  return Math.max(0, Math.min(discount, subtotalPaisa));
}

/** Throws a 422 COUPON_INVALID with the reason when the coupon cannot be applied. */
export function applyCoupon(
  coupon: CouponRule | null,
  subtotalPaisa: number,
  now = new Date(),
): number {
  const problem = couponProblem(coupon, subtotalPaisa, now);
  if (problem || !coupon) {
    const reason = problem ?? 'NOT_FOUND';
    throw new AppError('COUPON_INVALID', MESSAGES[reason], 422, {
      reason,
      ...(reason === 'MIN_SUBTOTAL' && coupon ? { minSubtotalPaisa: coupon.minSubtotalPaisa } : {}),
    });
  }
  return couponDiscount(coupon, subtotalPaisa);
}
