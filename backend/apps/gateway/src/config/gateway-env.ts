import { baseEnvSchema } from '@zelqune/common';
import { SERVICE_KEYS, SERVICES, type ServiceKey } from '@zelqune/contracts';
import { z } from 'zod';

const DEFAULT_TCP_PORTS: Record<ServiceKey, number> = {
  identity: 4001,
  catalog: 4002,
  inventory: 4003,
  order: 4004,
  payment: 4005,
  shipping: 4006,
  notification: 4007,
  analytics: 4008,
};

/** e.g. identity -> IDENTITY_SERVICE_HOST / IDENTITY_SERVICE_PORT */
export function serviceEnvPrefix(key: ServiceKey): string {
  return SERVICES[key].name.replace(/-/g, '_').toUpperCase();
}

const serviceAddressShape = Object.fromEntries(
  SERVICE_KEYS.flatMap((key) => [
    [`${serviceEnvPrefix(key)}_HOST`, z.string().min(1).default('localhost')],
    [
      `${serviceEnvPrefix(key)}_PORT`,
      z.coerce.number().int().positive().default(DEFAULT_TCP_PORTS[key]),
    ],
  ]),
) as Record<string, z.ZodDefault<z.ZodString> | z.ZodDefault<z.ZodCoercedNumber>>;

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

export const gatewayEnvSchema = baseEnvSchema.extend({
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
  RPC_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
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
  LOGIN_MAX_PER_IP: z.coerce.number().int().positive().default(5),
  LOGIN_IP_WINDOW_SECONDS: z.coerce.number().int().positive().default(900),
  LOGIN_MAX_FAILED_PER_PHONE: z.coerce.number().int().positive().default(5),
  LOGIN_LOCK_SECONDS: z.coerce.number().int().positive().default(900),
  ...serviceAddressShape,
});

export type GatewayEnv = z.infer<typeof gatewayEnvSchema>;

export function serviceAddress(
  config: GatewayEnv,
  key: ServiceKey,
): { host: string; port: number } {
  const env = config as unknown as Record<string, string | number>;
  const prefix = serviceEnvPrefix(key);
  return { host: String(env[`${prefix}_HOST`]), port: Number(env[`${prefix}_PORT`]) };
}
