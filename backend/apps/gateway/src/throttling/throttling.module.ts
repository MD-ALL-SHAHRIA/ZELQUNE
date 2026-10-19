import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { type ExecutionContext, Module, SetMetadata } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, type ThrottlerStorage } from '@nestjs/throttler';
import { APP_CONFIG } from '@zelqune/common';
import { type Redis } from 'ioredis';
import { type GatewayEnv } from '../config/gateway-env';
import { REDIS } from '../redis/redis.module';

export const THROTTLER_STORAGE = Symbol('THROTTLER_STORAGE');
const ROUTE_THROTTLE_METADATA = 'zelqune:route-throttle';

/** Stricter per-IP limits applied to specific routes on top of the default limit. */
export type RouteThrottleName = 'login' | 'checkout' | 'cartWrite' | 'track' | 'rfq' | 'beacon';

export const RouteThrottle = (name: RouteThrottleName): MethodDecorator =>
  SetMetadata(ROUTE_THROTTLE_METADATA, name);
/** Kept for readability on the login route. */
export const LoginThrottle = (): MethodDecorator => RouteThrottle('login');

const onlyFor =
  (name: RouteThrottleName) =>
  (ctx: ExecutionContext): boolean =>
    Reflect.getMetadata(ROUTE_THROTTLE_METADATA, ctx.getHandler()) !== name;

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
 * - default:   RATE_LIMIT_PER_MINUTE on every route
 * - login:     LOGIN_MAX_PER_IP per LOGIN_IP_WINDOW_SECONDS
 * - checkout:  CHECKOUT_MAX_PER_IP per CHECKOUT_IP_WINDOW_SECONDS
 * - cartWrite: CART_WRITES_PER_MINUTE
 * - track:     TRACK_PER_MINUTE (slows order-code guessing)
 * - rfq:       RFQ_PER_HOUR (bulk/corporate requests)
 * - beacon:    BEACON_PER_MINUTE (analytics events)
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
            skipIf: onlyFor('login'),
          },
          {
            name: 'checkout',
            ttl: config.CHECKOUT_IP_WINDOW_SECONDS * 1000,
            limit: config.CHECKOUT_MAX_PER_IP,
            skipIf: onlyFor('checkout'),
          },
          {
            name: 'cartWrite',
            ttl: 60_000,
            limit: config.CART_WRITES_PER_MINUTE,
            skipIf: onlyFor('cartWrite'),
          },
          { name: 'track', ttl: 60_000, limit: config.TRACK_PER_MINUTE, skipIf: onlyFor('track') },
          { name: 'rfq', ttl: 3_600_000, limit: config.RFQ_PER_HOUR, skipIf: onlyFor('rfq') },
          {
            name: 'beacon',
            ttl: 60_000,
            limit: config.BEACON_PER_MINUTE,
            skipIf: onlyFor('beacon'),
          },
        ],
      }),
    }),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class ThrottlingModule {}
