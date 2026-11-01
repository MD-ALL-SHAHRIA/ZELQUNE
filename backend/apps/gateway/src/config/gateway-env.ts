import { baseEnvSchema, serviceAddressEnvShape } from '@zelqune/common';
import { z } from 'zod';

const pemPublicKey = z
  .string()
  .transform((v) => v.replace(/\\n/g, '\n').trim())
  .refine((v) => v.includes('-----BEGIN PUBLIC KEY-----'), 'must be a PEM PUBLIC KEY');

/** "false" | "true" | hop count | comma-separated subnets, passed to Express `trust proxy`. */
const trustProxy = z
  .string()
  .default('false')
  .transform((v): boolean | number | string => {
    if (v === 'true') return true;
    if (v === 'false' || v === '') return false;
    return /^\d+$/.test(v) ? Number(v) : v;
  });

export const gatewayEnvSchema = baseEnvSchema
  .extend({
    HTTP_PORT: z.coerce.number().int().positive().default(3000),
    REDIS_URL: z.string().regex(/^rediss?:\/\//, 'must be a redis:// URL'),
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((v) =>
        v
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    TRUST_PROXY: trustProxy,
    /** ES256 public key (SPKI PEM) matching identity-service's JWT_PRIVATE_KEY. */
    JWT_PUBLIC_KEY: pemPublicKey,
    JWT_ISSUER: z.string().min(1).default('zelqune-identity'),
    JWT_AUDIENCE: z.string().min(1).default('zelqune-api'),
    REFRESH_COOKIE_NAME: z.string().min(1).default('zq_rt'),
    /** Keep true everywhere; browsers accept Secure cookies on http://localhost. */
    COOKIE_SECURE: z.stringbool().default(true),
    /** e.g. ".zelqune.com" so admin.<domain> and api.<domain> share it (ADR 0006). */
    COOKIE_DOMAIN: z.string().optional(),
    RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(120),
    /** Seconds public catalog/content GETs are cached in Redis; 0 disables. */
    PUBLIC_CACHE_SECONDS: z.coerce.number().int().min(0).max(3600).default(30),
    LOGIN_MAX_PER_IP: z.coerce.number().int().positive().default(5),
    LOGIN_IP_WINDOW_SECONDS: z.coerce.number().int().positive().default(900),
    LOGIN_MAX_FAILED_PER_PHONE: z.coerce.number().int().positive().default(5),
    LOGIN_LOCK_SECONDS: z.coerce.number().int().positive().default(900),
    CHECKOUT_MAX_PER_IP: z.coerce.number().int().positive().default(10),
    CHECKOUT_IP_WINDOW_SECONDS: z.coerce.number().int().positive().default(600),
    CART_WRITES_PER_MINUTE: z.coerce.number().int().positive().default(60),
    TRACK_PER_MINUTE: z.coerce.number().int().positive().default(20),
    RFQ_PER_HOUR: z.coerce.number().int().positive().default(5),
    /** Customer account emails (sign-up, resend, reset) per IP per hour (ADR 0021). */
    AUTH_EMAILS_PER_HOUR: z.coerce.number().int().positive().default(10),
    CUSTOMER_LOGIN_MAX_PER_IP: z.coerce.number().int().positive().default(30),
    /** Customer refresh cookie (separate from the admin one, path /v1/auth). */
    CUSTOMER_REFRESH_COOKIE_NAME: z.string().min(1).default('zq_crt'),
    /** Public URL of this API (OAuth redirect URIs) and of the storefront (where users return). */
    PUBLIC_API_URL: z.string().url().default('http://localhost:3000'),
    STOREFRONT_URL: z.string().url().default('http://localhost:3100'),
    /** Google / Facebook sign-in: off until the owner registers the apps (docs/accounts-setup.md). */
    GOOGLE_CLIENT_ID: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || undefined),
    GOOGLE_CLIENT_SECRET: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || undefined),
    FACEBOOK_APP_ID: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || undefined),
    FACEBOOK_APP_SECRET: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || undefined),
    BEACON_PER_MINUTE: z.coerce.number().int().positive().default(120),
    /** Bot check on checkout: fake (dev/tests) or Cloudflare Turnstile. */
    TURNSTILE_DRIVER: z.enum(['fake', 'cloudflare']).default('fake'),
    TURNSTILE_SECRET_KEY: z.string().optional(),
    ...serviceAddressEnvShape,
  })
  .superRefine((env, ctx) => {
    if (env.TURNSTILE_DRIVER === 'cloudflare' && !env.TURNSTILE_SECRET_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['TURNSTILE_SECRET_KEY'],
        message: 'required when TURNSTILE_DRIVER=cloudflare',
      });
    }
  });

export type GatewayEnv = z.infer<typeof gatewayEnvSchema>;
