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
