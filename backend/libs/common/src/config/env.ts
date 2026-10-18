import { z } from 'zod';

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

/** Env shared by every internal service (TCP microservice + private HTTP /health). */
export const serviceEnvSchema = baseEnvSchema.extend({
  HTTP_PORT: z.coerce.number().int().positive(),
  TCP_HOST: z.string().min(1).default('0.0.0.0'),
  TCP_PORT: z.coerce.number().int().positive(),
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, 'must be a postgres:// URL'),
  DB_SCHEMA: z.string().regex(/^[a-z_]+$/),
  RABBITMQ_URL: z.string().regex(/^amqps?:\/\//, 'must be an amqp:// URL'),
  OUTBOX_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(1000),
  OUTBOX_BATCH_SIZE: z.coerce.number().int().positive().max(500).default(50),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;
export type ServiceEnv = z.infer<typeof serviceEnvSchema>;

/** Validates env against a schema and fails fast with every problem listed. */
export function parseEnv<TSchema extends z.ZodType>(
  schema: TSchema,
  env: NodeJS.ProcessEnv = process.env,
): z.output<TSchema> {
  const result = schema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
