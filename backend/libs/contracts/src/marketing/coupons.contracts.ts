import { z } from 'zod';
import { paisaSchema } from '../catalog/catalog.contracts';

/** Coupon codes are stored and matched upper-case: letters, digits and dashes. */
export const couponCodeSchema = z
  .string()
  .trim()
  .min(3)
  .max(24)
  .regex(/^[A-Za-z0-9-]+$/, 'letters, digits and dashes')
  .transform((v) => v.toUpperCase());

export const COUPON_KINDS = ['PERCENT', 'FIXED'] as const;
export type CouponKind = (typeof COUPON_KINDS)[number];

const couponFields = {
  code: couponCodeSchema,
  description: z.string().trim().max(200).nullable().default(null),
  kind: z.enum(COUPON_KINDS),
  /** PERCENT: 1–90 (% off the product subtotal). FIXED: paisa off. */
  value: z.number().int().positive(),
  minSubtotalPaisa: paisaSchema.default(0),
  /** Cap for PERCENT coupons (null = no cap). */
  maxDiscountPaisa: paisaSchema.nullable().default(null),
  startsAt: z.iso.datetime().nullable().default(null),
  endsAt: z.iso.datetime().nullable().default(null),
  /** Total redemptions allowed (null = unlimited). */
  maxUses: z.number().int().positive().nullable().default(null),
  active: z.boolean().default(true),
};

const percentCap = (v: { kind: CouponKind; value: number }) =>
  v.kind !== 'PERCENT' || v.value <= 90;
const window = (v: { startsAt: string | null; endsAt: string | null }) =>
  !v.startsAt || !v.endsAt || v.startsAt < v.endsAt;

export const upsertCouponSchema = z
  .object(couponFields)
  .refine(percentCap, { message: 'A percent coupon is at most 90% off', path: ['value'] })
  .refine(window, { message: 'The end must be after the start', path: ['endsAt'] });
export type UpsertCouponInput = z.input<typeof upsertCouponSchema>;

export const couponSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  description: z.string().nullable(),
  kind: z.enum(COUPON_KINDS),
  value: z.number().int(),
  minSubtotalPaisa: paisaSchema,
  maxDiscountPaisa: paisaSchema.nullable(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  maxUses: z.number().int().nullable(),
  usedCount: z.number().int(),
  active: z.boolean(),
  /** Confirmed-order revenue and discount given through this code, all time. */
  ordersCount: z.number().int(),
  discountGivenPaisa: paisaSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Coupon = z.infer<typeof couponSchema>;
export const couponListSchema = z.object({ items: z.array(couponSchema) });

/** What the storefront shows once a code is applied. */
export const appliedCouponSchema = z.object({
  code: z.string(),
  description: z.string().nullable(),
  discountPaisa: paisaSchema,
});
export type AppliedCoupon = z.infer<typeof appliedCouponSchema>;

export const COUPON_PROBLEMS = [
  'NOT_FOUND',
  'INACTIVE',
  'NOT_STARTED',
  'EXPIRED',
  'USED_UP',
  'MIN_SUBTOTAL',
] as const;
