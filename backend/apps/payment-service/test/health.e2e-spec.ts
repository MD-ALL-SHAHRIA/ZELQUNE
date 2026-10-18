import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { configureHttpApp, RabbitMqConnection } from '@zelqune/common';
import request from 'supertest';
import { serviceTestEnv } from '../../../test/service-test-env';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('payment-service /health (e2e)', () => {
  let app: INestApplication;
  const db = { $queryRaw: jest.fn().mockResolvedValue([{ ok: 1 }]) };
  const rabbit = { isConnected: jest.fn().mockReturnValue(true) };

  beforeAll(async () => {
    Object.assign(process.env, serviceTestEnv('payments'));
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(db)
      .overrideProvider(RabbitMqConnection)
      .useValue(rabbit)
      .compile();
    app = moduleRef.createNestApplication({ bufferLogs: true });
    configureHttpApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('reports database and rabbitmq up', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      info: { database: { status: 'up' }, rabbitmq: { status: 'up' } },
    });
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('returns 503 when a dependency is down', async () => {
    rabbit.isConnected.mockReturnValueOnce(false);
    const res = await request(app.getHttpServer()).get('/health').expect(503);
    expect(res.body).toMatchObject({ status: 'error', error: { rabbitmq: { status: 'down' } } });
  });
});
