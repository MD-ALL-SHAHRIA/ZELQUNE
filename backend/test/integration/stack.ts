import { type INestApplication, type Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  APP_CONFIG,
  configureHttpApp,
  connectTcpTransport,
  type ServiceEnv,
} from '@zelqune/common';
import { exportPKCS8, exportSPKI, generateKeyPair } from 'jose';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppModule as CatalogModule } from '../../apps/catalog-service/src/app.module';
import { AppModule as GatewayModule } from '../../apps/gateway/src/app.module';
import { setupGateway } from '../../apps/gateway/src/setup';
import { AppModule as IdentityModule } from '../../apps/identity-service/src/app.module';
import { IT, SCHEMAS, serviceDbUrl } from './it-env';

export const OWNER = { phone: '01712345678', password: 'integration-owner-pass', name: 'IT Owner' };
export const ALLOWED_ORIGIN = 'http://localhost:3200';
const PORTS = { identityTcp: 49101, catalogTcp: 49102, identityHttp: 39101, catalogHttp: 39102 };

export interface Stack {
  identity: INestApplication;
  catalog: INestApplication;
  gateway: INestApplication;
  close(): Promise<void>;
}

/**
 * Each AppConfigModule reads process.env when its app is created, so apps are created one
 * after another with that app's env in place (exactly what each container would see).
 */
async function create(module: Type, env: Record<string, string>): Promise<INestApplication> {
  Object.assign(process.env, env);
  return NestFactory.create(module, { logger: false });
}

async function startService(
  module: Type,
  env: Record<string, string>,
  listenHttp = false,
): Promise<INestApplication> {
  const app = await create(module, env);
  configureHttpApp(app);
  connectTcpTransport(app, app.get<ServiceEnv>(APP_CONFIG));
  await app.startAllMicroservices();
  if (listenHttp) await app.listen(Number(env.HTTP_PORT), '127.0.0.1');
  else await app.init();
  return app;
}

const serviceEnv = (schema: string, httpPort: number, tcpPort: number) => ({
  NODE_ENV: 'development', // keeps the outbox relay running
  LOG_LEVEL: 'silent',
  HTTP_PORT: String(httpPort),
  TCP_HOST: '127.0.0.1',
  TCP_PORT: String(tcpPort),
  DB_SCHEMA: schema,
  DATABASE_URL: serviceDbUrl(schema),
  RABBITMQ_URL: IT.rabbitUrl,
  OUTBOX_POLL_INTERVAL_MS: '200',
});

export async function startStack(gatewayOverrides: Record<string, string> = {}): Promise<Stack> {
  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });

  const identity = await startService(IdentityModule, {
    ...serviceEnv(SCHEMAS.identity, PORTS.identityHttp, PORTS.identityTcp),
    JWT_PRIVATE_KEY: await exportPKCS8(privateKey),
    OWNER_PHONE: OWNER.phone,
    OWNER_PASSWORD: OWNER.password,
    OWNER_NAME: OWNER.name,
  });
  const catalog = await startService(
    CatalogModule,
    {
      ...serviceEnv(SCHEMAS.catalog, PORTS.catalogHttp, PORTS.catalogTcp),
      STORAGE_DRIVER: 'local',
      LOCAL_STORAGE_DIR: mkdtempSync(join(tmpdir(), 'zq-it-media-')),
      MEDIA_PUBLIC_BASE_URL: `http://127.0.0.1:${PORTS.catalogHttp}/dev-storage`,
    },
    true,
  );
  const gatewayEnv = {
    NODE_ENV: 'development',
    LOG_LEVEL: 'silent',
    HTTP_PORT: '39100',
    REDIS_URL: IT.redisUrl,
    CORS_ORIGINS: ALLOWED_ORIGIN,
    TRUST_PROXY: 'true',
    JWT_PUBLIC_KEY: await exportSPKI(publicKey),
    IDENTITY_SERVICE_HOST: '127.0.0.1',
    IDENTITY_SERVICE_PORT: String(PORTS.identityTcp),
    CATALOG_SERVICE_HOST: '127.0.0.1',
    CATALOG_SERVICE_PORT: String(PORTS.catalogTcp),
    LOGIN_MAX_PER_IP: '3',
    LOGIN_MAX_FAILED_PER_PHONE: '5',
    ...gatewayOverrides,
  };
  const gateway = await create(GatewayModule, gatewayEnv);
  setupGateway(gateway, { CORS_ORIGINS: [ALLOWED_ORIGIN], TRUST_PROXY: true });
  await gateway.init();

  return {
    identity,
    catalog,
    gateway,
    close: async () => {
      await gateway.close();
      await catalog.close();
      await identity.close();
    },
  };
}
