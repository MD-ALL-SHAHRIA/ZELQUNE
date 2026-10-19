import { ServiceRegistry } from '@zelqune/common';
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorageService } from '@nestjs/throttler';
import { SERVICE_KEYS, SERVICES, type ServiceKey } from '@zelqune/contracts';
import { exportSPKI, generateKeyPair, SignJWT } from 'jose';
import { AppModule } from '../src/app.module';
import { REDIS } from '../src/redis/redis.module';
import { setupGateway } from '../src/setup';
import { THROTTLER_STORAGE } from '../src/throttling/throttling.module';

/** Minimal in-memory Redis for the commands the gateway uses. */
export class FakeRedis {
  private readonly data = new Map<string, { value: string; expiresAt?: number }>();
  ping = () => Promise.resolve('PONG');
  quit = () => Promise.resolve('OK');
  get = (k: string) => Promise.resolve(this.live(k)?.value ?? null);
  /** SET key value [EX seconds] [NX] */
  set = (k: string, value: string, ...args: (string | number)[]) => {
    if (args.includes('NX') && this.live(k)) return Promise.resolve(null);
    const ex = args.indexOf('EX');
    const expiresAt = ex >= 0 ? Date.now() + Number(args[ex + 1]) * 1000 : undefined;
    this.data.set(k, { value, expiresAt });
    return Promise.resolve('OK');
  };
  incr = (k: string) => {
    const entry = this.live(k) ?? { value: '0' };
    entry.value = String(Number(entry.value) + 1);
    this.data.set(k, entry);
    return Promise.resolve(Number(entry.value));
  };
  expire = (k: string, seconds: number, mode?: 'NX') => {
    const entry = this.live(k);
    if (!entry || (mode === 'NX' && entry.expiresAt)) return Promise.resolve(0);
    entry.expiresAt = Date.now() + seconds * 1000;
    return Promise.resolve(1);
  };
  ttl = (k: string) => {
    const entry = this.live(k);
    if (!entry) return Promise.resolve(-2);
    return Promise.resolve(entry.expiresAt ? Math.ceil((entry.expiresAt - Date.now()) / 1000) : -1);
  };
  del = (k: string) => Promise.resolve(this.data.delete(k) ? 1 : 0);
  private live(k: string) {
    const entry = this.data.get(k);
    if (entry?.expiresAt && entry.expiresAt <= Date.now()) {
      this.data.delete(k);
      return undefined;
    }
    return entry;
  }
}

export interface FakeClient {
  name: string;
  send: jest.Mock;
  close: jest.Mock;
}

export interface GatewayHarness {
  app: INestApplication;
  clients: Record<ServiceKey, FakeClient>;
  redis: FakeRedis;
  signAccessToken(
    claims: { sub: string; role: string; typ?: string },
    opts?: { expiresIn?: string },
  ): Promise<string>;
}

export const ALLOWED_ORIGIN = 'http://localhost:3200';

/** Boots the real gateway AppModule with services, Redis and throttle storage faked. */
export async function createGatewayHarness(
  env: Record<string, string> = {},
): Promise<GatewayHarness> {
  // The gateway only gets the public key; the private key stays in the test to sign tokens.
  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true });
  Object.assign(process.env, {
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    REDIS_URL: 'redis://localhost:6379',
    JWT_PUBLIC_KEY: await exportSPKI(publicKey),
    CORS_ORIGINS: ALLOWED_ORIGIN,
    TRUST_PROXY: 'true',
    ...env,
  });

  const redis = new FakeRedis();
  const clients = Object.fromEntries(
    SERVICE_KEYS.map((key) => [
      key,
      {
        name: SERVICES[key].name,
        send: jest.fn().mockResolvedValue({ status: 'ok' }),
        close: jest.fn(),
      },
    ]),
  ) as Record<ServiceKey, FakeClient>;
  const registry = {
    all: () => Object.values(clients),
    get: (key: ServiceKey) => clients[key],
    onApplicationShutdown: jest.fn(),
  };

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(REDIS)
    .useValue(redis)
    .overrideProvider(ServiceRegistry)
    .useValue(registry)
    .overrideProvider(THROTTLER_STORAGE)
    .useValue(new ThrottlerStorageService())
    .compile();
  const app = moduleRef.createNestApplication({ bufferLogs: true });
  setupGateway(app, { CORS_ORIGINS: [ALLOWED_ORIGIN], TRUST_PROXY: true });
  await app.init();

  const signAccessToken = (
    claims: { sub: string; role: string; typ?: string },
    opts: { expiresIn?: string } = {},
  ) =>
    new SignJWT({ role: claims.role, typ: claims.typ ?? 'access' })
      .setProtectedHeader({ alg: 'ES256' })
      .setSubject(claims.sub)
      .setIssuer('zelqune-identity')
      .setAudience('zelqune-api')
      .setIssuedAt()
      .setExpirationTime(opts.expiresIn ?? '15m')
      .sign(privateKey);

  return { app, clients, redis, signAccessToken };
}
