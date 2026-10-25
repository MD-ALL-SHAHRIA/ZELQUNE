import { z } from 'zod';

/**
 * Flash sales and seasonal sales (catalog-service). A promotion lowers the price of the products
 * it covers while it runs; the regular price is shown struck through and checkout charges the
 * sale price (it uses the same price resolution).
 */
export const PROMOTION_KINDS = ['PERCENT', 'FIXED'] as const;

const promotionFields = {
  nameEn: z.string().trim().min(2).max(80),
  nameBn: z.string().trim().min(1).max(80),
  kind: z.enum(PROMOTION_KINDS),
  /** PERCENT: 1–90. FIXED: paisa off each unit (never below ৳1). */
  value: z.number().int().positive(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  /** Show a countdown and the "Flash sale" badge on the storefront. */
  flash: z.boolean().default(true),
  active: z.boolean().default(true),
  /** Empty = every active product. */
  productIds: z.array(z.uuid()).max(200).default([]),
};

export const upsertPromotionSchema = z
  .object(promotionFields)
  .refine((v) => v.kind !== 'PERCENT' || v.value <= 90, {
    message: 'At most 90% off',
    path: ['value'],
  })
  .refine((v) => v.startsAt < v.endsAt, {
    message: 'The end must be after the start',
    path: ['endsAt'],
  });
export type UpsertPromotionInput = z.input<typeof upsertPromotionSchema>;

export const promotionSchema = z.object({
  id: z.uuid(),
  nameEn: z.string(),
  nameBn: z.string(),
  kind: z.enum(PROMOTION_KINDS),
  value: z.number().int(),
  startsAt: z.string(),
  endsAt: z.string(),
  flash: z.boolean(),
  active: z.boolean(),
  productIds: z.array(z.uuid()),
  /** SCHEDULED / LIVE / ENDED / PAUSED, computed at read time. */
  state: z.enum(['SCHEDULED', 'LIVE', 'ENDED', 'PAUSED']),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Promotion = z.infer<typeof promotionSchema>;
export const promotionListSchema = z.object({ items: z.array(promotionSchema) });

/** Public: the sale running now (the storefront banner), or null. */
export const activeSaleSchema = z.object({
  sale: z
    .object({
      id: z.uuid(),
      nameEn: z.string(),
      nameBn: z.string(),
      kind: z.enum(PROMOTION_KINDS),
      value: z.number().int(),
      endsAt: z.string(),
      flash: z.boolean(),
      productIds: z.array(z.uuid()),
    })
    .nullable(),
});
export type ActiveSale = z.infer<typeof activeSaleSchema>;
