import { serviceEnvSchema } from '@zelqune/common';
import { z } from 'zod';

const optional = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || undefined);

export const notificationEnvSchema = serviceEnvSchema.extend({
  /** console = log only (dev/tests). A real BD SMS gateway is added in M3, with owner approval. */
  SMS_DRIVER: z.enum(['console']).default('console'),
  /** Owner's phone for internal alerts (new bulk/corporate requests). */
  OWNER_NOTIFY_PHONE: optional,
  /** Used in links inside messages. */
  STOREFRONT_URL: z.string().url().default('http://localhost:3100'),
});

export type NotificationEnv = z.infer<typeof notificationEnvSchema>;
