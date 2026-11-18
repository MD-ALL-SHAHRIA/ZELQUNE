import { serviceEnvSchema } from '@zelqune/common';
import { z } from 'zod';

const paisa = (def: number) => z.coerce.number().int().nonnegative().default(def);

/** All fees are integer paisa and configurable; defaults are the owner-approved placeholders. */
export const shippingEnvSchema = serviceEnvSchema.extend({
  SHIPPING_FEE_DHAKA_PAISA: paisa(6000),
  SHIPPING_FEE_SUBURB_PAISA: paisa(9000),
  SHIPPING_FEE_OUTSIDE_PAISA: paisa(12000),
  /** Weight included in the base fee. */
  SHIPPING_BASE_WEIGHT_GRAMS: z.coerce.number().int().positive().default(1000),
  /** Per started kg above the base weight. */
  SHIPPING_EXTRA_PER_KG_PAISA: paisa(0),
  /** Volumetric weight (kg) = L x W x H (cm) / divisor. */
  /** 0 = charge by actual weight only (default, as Daraz does); e.g. 5000 bills big boxes by size. */
  SHIPPING_VOLUMETRIC_DIVISOR: z.coerce.number().int().min(0).default(0),
  /** Used when a variant has no packaged weight. */
  SHIPPING_DEFAULT_PACKAGE_WEIGHT_GRAMS: z.coerce.number().int().positive().default(1000),
});

export type ShippingEnv = z.infer<typeof shippingEnvSchema>;
