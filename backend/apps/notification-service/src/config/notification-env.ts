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
  /** console = log that nothing was sent; smtp = send (Mailpit in dev, the provider in prod). */
  EMAIL_DRIVER: z.enum(['console', 'smtp']).default('console'),
  SMTP_HOST: optional,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  /** true for port 465 (TLS from the start); 587 upgrades with STARTTLS. */
  SMTP_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),
  SMTP_USER: optional,
  SMTP_PASS: optional,
  MAIL_FROM: z.string().default('Zelqune <hello@zelqune.com>'),
  /** Used in links inside messages. */
  STOREFRONT_URL: z.string().url().default('http://localhost:3100'),
});

export type NotificationEnv = z.infer<typeof notificationEnvSchema>;
