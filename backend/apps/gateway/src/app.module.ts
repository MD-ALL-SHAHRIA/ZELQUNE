import { Module } from '@nestjs/common';
import {
  AppConfigModule,
  createLoggerModule,
  HealthModule,
  IdempotencyModule,
  RedisIdempotencyStore,
  ZOD_PROVIDERS,
} from '@zelqune/common';
import { type Redis } from 'ioredis';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { gatewayEnvSchema } from './config/gateway-env';
import { gatewayProbes } from './health/gateway-probes';
import { REDIS, RedisModule } from './redis/redis.module';
import { ServiceRegistry } from './services/service-registry';
import { ServicesModule } from './services/services.module';
import { ThrottlingModule } from './throttling/throttling.module';

@Module({
  imports: [
    AppConfigModule.forRoot(gatewayEnvSchema),
    createLoggerModule('gateway'),
    RedisModule,
    ServicesModule,
    // Throttling first so floods are rejected before token verification.
    ThrottlingModule,
    AuthModule,
    CatalogModule,
    IdempotencyModule.forRoot({
      inject: [REDIS],
      store: (redis: Redis) => new RedisIdempotencyStore(redis),
    }),
    HealthModule.forRoot({
      inject: [REDIS, ServiceRegistry],
      probes: gatewayProbes,
    }),
  ],
  providers: [...ZOD_PROVIDERS],
})
export class AppModule {}
