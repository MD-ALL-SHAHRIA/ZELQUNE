/** Minimal valid env for booting a service AppModule in e2e tests (deps are mocked). */
export function serviceTestEnv(schema: string): Record<string, string> {
  return {
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    HTTP_PORT: '3999',
    TCP_PORT: '4999',
    DB_SCHEMA: schema,
    DATABASE_URL: `postgresql://test:test@localhost:5432/test?schema=${schema}`,
    RABBITMQ_URL: 'amqp://test:test@localhost:5672',
    CUSTOMER_KEY_SECRET: 'test-customer-key-secret-32-chars!!',
  };
}
