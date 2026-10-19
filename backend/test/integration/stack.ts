import { type INestApplication, type Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  APP_CONFIG,
  configureHttpApp,
  connectTcpTransport,
  type ServiceEnv,
  serviceQueues,
} from '@zelqune/common';
import { connect } from 'amqplib';
import { exportPKCS8, exportSPKI, generateKeyPair } from 'jose';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppModule as CatalogModule } from '../../apps/catalog-service/src/app.module';
import { AppModule as GatewayModule } from '../../apps/gateway/src/app.module';
import { setupGateway } from '../../apps/gateway/src/setup';
import { AppModule as IdentityModule } from '../../apps/identity-service/src/app.module';
import { AppModule as InventoryModule } from '../../apps/inventory-service/src/app.module';
import { AppModule as OrderModule } from '../../apps/order-service/src/app.module';
import { AppModule as PaymentModule } from '../../apps/payment-service/src/app.module';
import { AppModule as ShippingModule } from '../../apps/shipping-service/src/app.module';
import { IT, type SchemaName, serviceDbUrl } from './it-env';

export const OWNER = { phone: '01712345678', password: 'integration-owner-pass', name: 'IT Owner' };
export const ALLOWED_ORIGIN = 'http://localhost:3200';
export const TEST_BKASH_NUMBER = '01711111111';

type ServiceKey = 'identity' | 'catalog' | 'inventory' | 'order' | 'payment' | 'shipping';

const SERVICES: Record<
  ServiceKey,
  { module: Type; name: string; schema: SchemaName; tcp: number; http: number }
> = {
  identity: {
    module: IdentityModule,
    name: 'identity-service',
    schema: 'identity',
    tcp: 49101,
    http: 39101,
  },
  catalog: {
    module: CatalogModule,
    name: 'catalog-service',
    schema: 'catalog',
    tcp: 49102,
    http: 39102,
  },
  inventory: {
    module: InventoryModule,
    name: 'inventory-service',
    schema: 'inventory',
    tcp: 49103,
    http: 39103,
  },
  order: { module: OrderModule, name: 'order-service', schema: 'orders', tcp: 49104, http: 39104 },
  payment: {
    module: PaymentModule,
    name: 'payment-service',
    schema: 'payments',
    tcp: 49105,
    http: 39105,
  },
  shipping: {
    module: ShippingModule,
    name: 'shipping-service',
    schema: 'shipping',
    tcp: 49106,
    http: 39106,
  },
};

export type Stack = Partial<Record<ServiceKey, INestApplication>> & {
  gateway: INestApplication;
  close(): Promise<void>;
};

/** TCP addresses of every in-process service, for the gateway and order-service. */
const ADDRESSES = Object.fromEntries(
  Object.values(SERVICES).flatMap((s) => {
    const prefix = s.name.replace(/-/g, '_').toUpperCase();
    return [
      [`${prefix}_HOST`, '127.0.0.1'],
      [`${prefix}_PORT`, String(s.tcp)],
    ];
  }),
);

/**
 * Each AppConfigModule reads process.env when its app is created, so apps are created one
 * after another with that app's env in place (exactly what each container would see).
 */
async function create(module: Type, env: Record<string, string>): Promise<INestApplication> {
  Object.assign(process.env, env);
  return NestFactory.create(module, { logger: false });
}

async function purgeServiceQueues(services: ServiceKey[]): Promise<void> {
  const conn = await connect(IT.rabbitUrl);
  try {
    for (const key of services) {
      const ch = await conn.createChannel();
      ch.on('error', () => undefined);
      await ch.purgeQueue(serviceQueues(SERVICES[key].name).queue).catch(() => undefined);
      await ch.close().catch(() => undefined);
    }
  } finally {
    await conn.close();
  }
}

export interface StackOptions {
  database: string;
  services: ServiceKey[];
  gatewayEnv?: Record<string, string>;
  serviceEnv?: Partial<Record<ServiceKey, Record<string, string>>>;
}

export async function startStack(options: StackOptions): Promise<Stack> {
  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
  await purgeServiceQueues(options.services);
  const extra: Record<ServiceKey, Record<string, string>> = {
    identity: {
      JWT_PRIVATE_KEY: await exportPKCS8(privateKey),
      OWNER_PHONE: OWNER.phone,
      OWNER_PASSWORD: OWNER.password,
      OWNER_NAME: OWNER.name,
    },
    catalog: {
      STORAGE_DRIVER: 'local',
      LOCAL_STORAGE_DIR: mkdtempSync(join(tmpdir(), 'zq-it-media-')),
      MEDIA_PUBLIC_BASE_URL: `http://127.0.0.1:${SERVICES.catalog.http}/dev-storage`,
    },
    inventory: {},
    order: { CUSTOMER_KEY_SECRET: 'it-customer-key-secret-0123456789abcdef' },
    payment: { PAYMENT_BKASH_NUMBER: TEST_BKASH_NUMBER, PAYMENT_NAGAD_NUMBER: '' },
    shipping: {},
  };

  const stack: Partial<Record<ServiceKey, INestApplication>> = {};
  for (const key of options.services) {
    const s = SERVICES[key];
    const app = await create(s.module, {
      ...ADDRESSES,
      NODE_ENV: 'development', // keeps the outbox relay and consumers running
      LOG_LEVEL: 'silent',
      HTTP_PORT: String(s.http),
      TCP_HOST: '127.0.0.1',
      TCP_PORT: String(s.tcp),
      DB_SCHEMA: s.schema,
      DATABASE_URL: serviceDbUrl(s.schema, options.database),
      RABBITMQ_URL: IT.rabbitUrl,
      OUTBOX_POLL_INTERVAL_MS: '200',
      EVENT_RETRY_DELAYS_MS: '200,400',
      // timers are driven explicitly by the tests
      ORDER_SWEEP_INTERVAL_MS: '3600000',
      RESERVATION_SWEEP_INTERVAL_MS: '3600000',
      ...extra[key],
      ...options.serviceEnv?.[key],
    });
    configureHttpApp(app);
    connectTcpTransport(app, app.get<ServiceEnv>(APP_CONFIG));
    await app.startAllMicroservices();
    if (key === 'catalog') await app.listen(s.http, '127.0.0.1');
    else await app.init();
    stack[key] = app;
  }

  const gateway = await create(GatewayModule, {
    ...ADDRESSES,
    NODE_ENV: 'development',
    LOG_LEVEL: 'silent',
    HTTP_PORT: '39100',
    REDIS_URL: IT.redisUrl,
    CORS_ORIGINS: ALLOWED_ORIGIN,
    TRUST_PROXY: 'true',
    JWT_PUBLIC_KEY: await exportSPKI(publicKey),
    LOGIN_MAX_PER_IP: '3',
    LOGIN_MAX_FAILED_PER_PHONE: '5',
    TURNSTILE_DRIVER: 'fake',
    ...options.gatewayEnv,
  });
  setupGateway(gateway, { CORS_ORIGINS: [ALLOWED_ORIGIN], TRUST_PROXY: true });
  await gateway.init();

  return {
    ...stack,
    gateway,
    close: async () => {
      await gateway.close();
      for (const key of [...options.services].reverse()) await stack[key]?.close();
    },
  };
}
