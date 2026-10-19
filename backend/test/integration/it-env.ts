/** Connection settings for integration tests; defaults match the local docker-compose stack. */
export const IT = {
  pgAdminUrl:
    process.env.IT_PG_ADMIN_URL ?? 'postgresql://zelqune:zelqune_dev@localhost:5432/zelqune',
  pgHost: process.env.IT_PG_HOST ?? 'localhost:5432',
  serviceDbPassword: process.env.IT_SERVICE_DB_PASSWORD ?? 'zelqune_svc_dev',
  database: 'zelqune_it',
  rabbitUrl: process.env.IT_RABBITMQ_URL ?? 'amqp://zelqune:zelqune_dev@localhost:5672',
  /** Separate Redis DB so tests never touch dev data. */
  redisUrl: process.env.IT_REDIS_URL ?? 'redis://localhost:6379/15',
};

export const SCHEMAS = {
  identity: 'identity',
  catalog: 'catalog',
  inventory: 'inventory',
  orders: 'orders',
  payments: 'payments',
  shipping: 'shipping',
} as const;

/** Postgres schema -> app that owns it (for migrations). */
export const SCHEMA_APPS: Record<(typeof SCHEMAS)[keyof typeof SCHEMAS], string> = {
  identity: 'identity-service',
  catalog: 'catalog-service',
  inventory: 'inventory-service',
  orders: 'order-service',
  payments: 'payment-service',
  shipping: 'shipping-service',
};

export function serviceDbUrl(schema: string): string {
  return `postgresql://${schema}_svc:${IT.serviceDbPassword}@${IT.pgHost}/${IT.database}?schema=${schema}`;
}
