/** Connection settings for integration tests; defaults match the local docker-compose stack. */
export const IT = {
  pgAdminUrl:
    process.env.IT_PG_ADMIN_URL ?? 'postgresql://zelqune:zelqune_dev@localhost:5432/zelqune',
  pgHost: process.env.IT_PG_HOST ?? 'localhost:5432',
  serviceDbPassword: process.env.IT_SERVICE_DB_PASSWORD ?? 'zelqune_svc_dev',
  /** Separate vhost so test events never reach a running dev stack (and vice versa). */
  rabbitUrl: process.env.IT_RABBITMQ_URL ?? 'amqp://zelqune:zelqune_dev@localhost:5672/zelqune_it',
  rabbitManagementUrl: process.env.IT_RABBITMQ_MANAGEMENT_URL ?? 'http://localhost:15672',
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
  notifications: 'notifications',
  analytics: 'analytics',
} as const;
export type SchemaName = (typeof SCHEMAS)[keyof typeof SCHEMAS];

/** Postgres schema -> app that owns it (for migrations). */
export const SCHEMA_APPS: Record<SchemaName, string> = {
  identity: 'identity-service',
  catalog: 'catalog-service',
  inventory: 'inventory-service',
  orders: 'order-service',
  payments: 'payment-service',
  shipping: 'shipping-service',
  notifications: 'notification-service',
  analytics: 'analytics-service',
};

export function serviceDbUrl(schema: SchemaName, database: string): string {
  return `postgresql://${schema}_svc:${IT.serviceDbPassword}@${IT.pgHost}/${database}?schema=${schema}`;
}
