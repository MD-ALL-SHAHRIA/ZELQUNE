import { serviceEnvSchema } from '@zelqune/common';
import { z } from 'zod';

export const catalogEnvSchema = serviceEnvSchema
  .extend({
    /** `local` = dev/test fake served by this service; `r2` = Cloudflare R2 (S3 API). */
    STORAGE_DRIVER: z.enum(['local', 'r2']).default('local'),
    /** Public base URL that media keys are appended to. */
    MEDIA_PUBLIC_BASE_URL: z.string().url().default('http://localhost:3002/dev-storage'),
    LOCAL_STORAGE_DIR: z.string().default('/tmp/zelqune-media'),
    /** Signs local upload URLs. If unset a random per-process secret is used (dev only). */
    LOCAL_STORAGE_SIGNING_SECRET: z
      .string()
      .optional()
      .transform((v) => v || undefined)
      .refine((v) => v === undefined || v.length >= 32, 'must be at least 32 characters'),
    /**
     * Browser origins allowed to PUT to the local dev storage (dashboard, storefront). Only used
     * with STORAGE_DRIVER=local; R2 has its own bucket CORS rules.
     */
    DEV_STORAGE_CORS_ORIGINS: z
      .string()
      .default('http://localhost:3200,http://localhost:3100')
      .transform((v) =>
        v
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean),
      ),
    UPLOAD_URL_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(600),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_DRIVER !== 'r2') return;
    for (const key of [
      'R2_ACCOUNT_ID',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'R2_BUCKET',
    ] as const) {
      if (!env[key])
        ctx.addIssue({ code: 'custom', path: [key], message: 'required when STORAGE_DRIVER=r2' });
    }
  });

export type CatalogEnv = z.infer<typeof catalogEnvSchema>;
