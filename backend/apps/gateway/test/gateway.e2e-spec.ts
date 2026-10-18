import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppError } from '@zelqune/common';
import { SERVICE_KEYS, SERVICES } from '@zelqune/contracts';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { REDIS } from '../src/redis/redis.module';
import { ServiceRegistry } from '../src/services/service-registry';
import { setupGateway } from '../src/setup';

describe('gateway (e2e)', () => {
  let app: INestApplication;
  const redis = {
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
  };
  const clients = SERVICE_KEYS.map((key) => ({
    name: SERVICES[key].name,
    send: jest.fn().mockResolvedValue({ status: 'ok' }),
    close: jest.fn().mockResolvedValue(undefined),
  }));
  const registry = { all: () => clients, get: jest.fn(), onApplicationShutdown: jest.fn() };

  beforeAll(async () => {
    Object.assign(process.env, {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      REDIS_URL: 'redis://localhost:6379',
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(REDIS)
      .useValue(redis)
      .overrideProvider(ServiceRegistry)
      .useValue(registry)
      .compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    setupGateway(app, { CORS_ORIGINS: [] });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports redis and all 8 services up (no /v1 prefix)', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(Object.keys(res.body.info).sort()).toEqual(
      ['redis', ...SERVICE_KEYS.map((k) => SERVICES[k].name)].sort(),
    );
  });

  it('GET /health returns 503 naming the service that is down', async () => {
    clients[0].send.mockRejectedValueOnce(new AppError('UPSTREAM_UNAVAILABLE', 'down', 503));
    const res = await request(app.getHttpServer()).get('/health').expect(503);
    expect(res.body.error[clients[0].name]).toMatchObject({ status: 'down' });
  });

  it('serves Swagger UI at /docs and the OpenAPI spec at /docs-json', async () => {
    const ui = await request(app.getHttpServer()).get('/docs').redirects(1).expect(200);
    expect(ui.text).toContain('swagger-ui');
    const spec = await request(app.getHttpServer()).get('/docs-json').expect(200);
    expect(spec.body.openapi).toMatch(/^3\./);
    expect(spec.body.info.title).toBe('Zelqune API');
  });

  it('returns the standard error body for unknown /v1 routes', async () => {
    const res = await request(app.getHttpServer()).get('/v1/does-not-exist').expect(404);
    expect(res.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: expect.any(String),
        requestId: res.headers['x-request-id'],
      },
    });
  });

  it('propagates an incoming x-request-id and generates one otherwise', async () => {
    const echoed = await request(app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'req-abc-123');
    expect(echoed.headers['x-request-id']).toBe('req-abc-123');

    const generated = await request(app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'bad id!');
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});
