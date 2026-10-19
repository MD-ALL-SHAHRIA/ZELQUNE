import { serviceEnvSchema } from '@zelqune/common';
import { z } from 'zod';

const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined);

export const paymentEnvSchema = serviceEnvSchema.extend({
  /** Where customers send manual payments; a method without a number is not offered. */
  PAYMENT_BKASH_NUMBER: optional,
  PAYMENT_BKASH_ACCOUNT_TYPE: z.string().default('personal'),
  PAYMENT_NAGAD_NUMBER: optional,
  PAYMENT_NAGAD_ACCOUNT_TYPE: z.string().default('personal'),
});

export type PaymentEnv = z.infer<typeof paymentEnvSchema>;
