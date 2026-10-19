import { serviceEnvSchema } from '@zelqune/common';
import { z } from 'zod';

/** PEM values may arrive with literal "\n" (single-line env files); restore real newlines. */
const pem = (label: string) =>
  z
    .string()
    .transform((v) => v.replace(/\\n/g, '\n').trim())
    .refine((v) => v.includes(`-----BEGIN ${label}-----`), `must be a PEM ${label}`);

export const identityEnvSchema = serviceEnvSchema.extend({
  /** ES256 (P-256) private key, PKCS#8 PEM. Generate with `pnpm keys:dev`. */
  JWT_PRIVATE_KEY: pem('PRIVATE KEY'),
  JWT_ISSUER: z.string().min(1).default('zelqune-identity'),
  JWT_AUDIENCE: z.string().min(1).default('zelqune-api'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  /** Only read by `seed`. */
  OWNER_PHONE: z.string().optional(),
  OWNER_PASSWORD: z.string().optional(),
  OWNER_NAME: z.string().optional(),
});

export type IdentityEnv = z.infer<typeof identityEnvSchema>;
