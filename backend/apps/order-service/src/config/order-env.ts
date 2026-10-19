import { serviceAddressEnvShape, serviceEnvSchema } from '@zelqune/common';
import { z } from 'zod';

export const orderEnvSchema = serviceEnvSchema
  .extend({
    ...serviceAddressEnvShape,
    /** fixed: ADVANCE_FIXED_PAISA per order (capped at the total); percent: of the subtotal. */
    ADVANCE_MODE: z.enum(['fixed', 'percent']).default('fixed'),
    ADVANCE_FIXED_PAISA: z.coerce.number().int().positive().default(30000),
    ADVANCE_PERCENT: z.preprocess(
      (v) => (v === '' ? undefined : v),
      z.coerce.number().int().min(1).max(100).optional(),
    ),
    /** PENDING_PAYMENT orders older than this are cancelled (fractions allowed for tests). */
    ORDER_HOLD_HOURS: z.coerce.number().positive().default(48),
    ORDER_SWEEP_INTERVAL_MS: z.coerce.number().int().positive().default(60_000),
    /** Unfinished checkout sagas older than this are compensated. */
    SAGA_RECOVERY_AFTER_SECONDS: z.coerce.number().int().positive().default(60),
    CART_TTL_DAYS: z.coerce.number().int().positive().default(30),
  })
  .superRefine((env, ctx) => {
    if (env.ADVANCE_MODE === 'percent' && env.ADVANCE_PERCENT === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['ADVANCE_PERCENT'],
        message: 'required when ADVANCE_MODE=percent',
      });
    }
  });

export type OrderEnv = z.infer<typeof orderEnvSchema>;
