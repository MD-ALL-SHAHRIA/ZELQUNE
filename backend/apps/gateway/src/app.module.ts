import { Module } from '@nestjs/common';
import {
  AppConfigModule,
  createLoggerModule,
  HealthModule,
  IdempotencyModule,
  RedisIdempotencyStore,
} from '@zelqune/common';
import { type Redis } from 'ioredis';
import { gatewayEnvSchema } from './config/gateway-env';
import { gatewayProbes } from './health/gateway-probes';
import { REDIS, RedisModule } from './redis/redis.module';
import { ServiceRegistry } from './services/service-registry';
import { ServicesModule } from './services/services.module';

@Module({
  imports: [
    AppConfigModule.forRoot(gatewayEnvSchema),
    createLoggerModule('gateway'),
    RedisModule,
    ServicesModule,
    IdempotencyModule.forRoot({
      inject: [REDIS],
      store: (redis: Redis) => new RedisIdempotencyStore(redis),
    }),
    HealthModule.forRoot({
      inject: [REDIS, ServiceRegistry],
      probes: gatewayProbes,
    }),
  ],
})
export class AppModule {}
