import { serviceEnvSchema } from '@zelqune/common';
import { z } from 'zod';

const paisa = (def: number) => z.coerce.number().int().nonnegative().default(def);

/** All fees are integer paisa and configurable; defaults are the owner-approved placeholders. */
export const shippingEnvSchema = serviceEnvSchema.extend({
  SHIPPING_FEE_DHAKA_PAISA: paisa(7000),
  SHIPPING_FEE_SUBURB_PAISA: paisa(11000),
  SHIPPING_FEE_OUTSIDE_PAISA: paisa(13000),
  /** Weight included in the base fee. */
  SHIPPING_BASE_WEIGHT_GRAMS: z.coerce.number().int().positive().default(1000),
  /** Per started kg above the base weight. */
  SHIPPING_EXTRA_PER_KG_PAISA: paisa(2000),
  /** Volumetric weight (kg) = L x W x H (cm) / divisor. */
  SHIPPING_VOLUMETRIC_DIVISOR: z.coerce.number().int().positive().default(5000),
  /** Used when a variant has no packaged weight. */
  SHIPPING_DEFAULT_PACKAGE_WEIGHT_GRAMS: z.coerce.number().int().positive().default(1000),
});

export type ShippingEnv = z.infer<typeof shippingEnvSchema>;
