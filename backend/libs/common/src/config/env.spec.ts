import { parseEnv, serviceEnvSchema } from './env';

describe('parseEnv', () => {
  const valid = {
    HTTP_PORT: '3001',
    TCP_PORT: '4001',
    DB_SCHEMA: 'identity',
    DATABASE_URL: 'postgresql://u:p@localhost:5432/zelqune?schema=identity',
    RABBITMQ_URL: 'amqp://u:p@localhost:5672',
  };

  it('coerces types and applies defaults', () => {
    const config = parseEnv(serviceEnvSchema, valid);
    expect(config).toMatchObject({
      HTTP_PORT: 3001,
      TCP_PORT: 4001,
      TCP_HOST: '0.0.0.0',
      NODE_ENV: 'development',
      LOG_LEVEL: 'info',
      OUTBOX_BATCH_SIZE: 50,
    });
  });

  it('fails fast listing every invalid variable', () => {
    expect(() =>
      parseEnv(serviceEnvSchema, { ...valid, DATABASE_URL: 'mysql://x', TCP_PORT: 'abc' }),
    ).toThrow(/DATABASE_URL[\s\S]*TCP_PORT|TCP_PORT[\s\S]*DATABASE_URL/);
  });
});
