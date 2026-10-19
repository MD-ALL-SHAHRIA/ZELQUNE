import { AppError } from '@zelqune/common';
import { SERVICE_KEYS, SERVICES } from '@zelqune/contracts';
import request from 'supertest';
import { createGatewayHarness, type GatewayHarness } from './helpers';

describe('gateway (e2e)', () => {
  let h: GatewayHarness;

  beforeAll(async () => {
    h = await createGatewayHarness();
  });

  afterAll(async () => {
    await h.app.close();
  });

  it('GET /health reports redis and all 8 services up (public, no /v1 prefix)', async () => {
    const res = await request(h.app.getHttpServer()).get('/health').expect(200);
    expect(res.body.status).toBe('ok');
    expect(Object.keys(res.body.info).sort()).toEqual(
      ['redis', ...SERVICE_KEYS.map((k) => SERVICES[k].name)].sort(),
    );
  });

  it('GET /health returns 503 naming the service that is down', async () => {
    h.clients.identity.send.mockRejectedValueOnce(
      new AppError('UPSTREAM_UNAVAILABLE', 'down', 503),
    );
    const res = await request(h.app.getHttpServer()).get('/health').expect(503);
    expect(res.body.error['identity-service']).toMatchObject({ status: 'down' });
  });

  it('serves Swagger UI at /docs and the OpenAPI spec at /docs-json', async () => {
    const ui = await request(h.app.getHttpServer()).get('/docs').redirects(1).expect(200);
    expect(ui.text).toContain('swagger-ui');
    const spec = await request(h.app.getHttpServer()).get('/docs-json').expect(200);
    expect(spec.body.openapi).toMatch(/^3\./);
    expect(spec.body.info.title).toBe('Zelqune API');
    expect(Object.keys(spec.body.paths)).toEqual(
      expect.arrayContaining([
        '/v1/admin/auth/login',
        '/v1/admin/auth/me',
        '/v1/catalog/products/{slug}',
      ]),
    );
  });

  it('returns the standard error body for unknown /v1 routes', async () => {
    const res = await request(h.app.getHttpServer()).get('/v1/does-not-exist').expect(404);
    expect(res.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: expect.any(String),
        requestId: res.headers['x-request-id'],
      },
    });
  });

  it('propagates an incoming x-request-id and generates one otherwise', async () => {
    const echoed = await request(h.app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'req-abc-123');
    expect(echoed.headers['x-request-id']).toBe('req-abc-123');
    const generated = await request(h.app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'bad id!');
    expect(generated.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('rate limits per IP (default throttler) with 429 and Retry-After', async () => {
    const limited = await createGatewayHarness({ RATE_LIMIT_PER_MINUTE: '3' });
    try {
      const hit = () =>
        request(limited.app.getHttpServer()).get('/health').set('x-forwarded-for', '203.0.113.50');
      for (let i = 0; i < 3; i++) await hit().expect(200);
      const res = await hit().expect(429);
      expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(res.headers['retry-after']).toBeDefined();
      // another IP is unaffected
      await request(limited.app.getHttpServer())
        .get('/health')
        .set('x-forwarded-for', '203.0.113.51')
        .expect(200);
    } finally {
      await limited.app.close();
    }
  });
});
