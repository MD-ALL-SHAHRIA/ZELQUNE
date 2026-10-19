import { serviceEnvSchema } from '@zelqune/common';
import { z } from 'zod';

export const inventoryEnvSchema = serviceEnvSchema.extend({
  /** Checkout window: how long stock is reserved before the order is placed. */
  RESERVATION_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  /** After the order is placed, stock stays HELD until confirmation (fractions allowed for tests). */
  ORDER_HOLD_HOURS: z.coerce.number().positive().default(48),
  RESERVATION_SWEEP_INTERVAL_MS: z.coerce.number().int().positive().default(30_000),
});

export type InventoryEnv = z.infer<typeof inventoryEnvSchema>;
