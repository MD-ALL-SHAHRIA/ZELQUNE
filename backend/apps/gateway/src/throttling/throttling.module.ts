import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { type ExecutionContext, Module, SetMetadata } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, type ThrottlerStorage } from '@nestjs/throttler';
import { APP_CONFIG } from '@zelqune/common';
import { type Redis } from 'ioredis';
import { type GatewayEnv } from '../config/gateway-env';
import { REDIS } from '../redis/redis.module';

export const THROTTLER_STORAGE = Symbol('THROTTLER_STORAGE');
const LOGIN_THROTTLE_METADATA = 'zelqune:login-throttle';

/** Applies the stricter per-IP "login" throttler to a route (in addition to the default). */
export const LoginThrottle = (): MethodDecorator => SetMetadata(LOGIN_THROTTLE_METADATA, true);

const isLoginRoute = (ctx: ExecutionContext): boolean =>
  Reflect.getMetadata(LOGIN_THROTTLE_METADATA, ctx.getHandler()) === true;

/** Separate so tests can override it with the in-memory storage. */
@Module({
  providers: [
    {
      provide: THROTTLER_STORAGE,
      inject: [REDIS],
      useFactory: (redis: Redis): ThrottlerStorage => new ThrottlerStorageRedisService(redis),
    },
  ],
  exports: [THROTTLER_STORAGE],
})
export class ThrottlerStorageModule {}

/**
 * Per-IP rate limits stored in Redis (shared by all gateway instances):
 * - default: RATE_LIMIT_PER_MINUTE per IP on every route
 * - login:   LOGIN_MAX_PER_IP per LOGIN_IP_WINDOW_SECONDS, only on @LoginThrottle() routes
 * Client IPs are correct behind the proxy via TRUST_PROXY.
 */
@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ThrottlerStorageModule],
      inject: [APP_CONFIG, THROTTLER_STORAGE],
      useFactory: (config: GatewayEnv, storage: ThrottlerStorage) => ({
        storage,
        throttlers: [
          { name: 'default', ttl: 60_000, limit: config.RATE_LIMIT_PER_MINUTE },
          {
            name: 'login',
            ttl: config.LOGIN_IP_WINDOW_SECONDS * 1000,
            limit: config.LOGIN_MAX_PER_IP,
            skipIf: (ctx) => !isLoginRoute(ctx),
          },
        ],
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class ThrottlingModule {}
