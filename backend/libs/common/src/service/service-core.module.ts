import { type DynamicModule, Global, Module, type Type } from '@nestjs/common';
import { type ServiceName } from '@zelqune/contracts';
import { type z } from 'zod';
import { APP_CONFIG, AppConfigModule } from '../config/config.module';
import { serviceEnvSchema, type ServiceEnv } from '../config/env';
import { TRANSACTIONAL_DB, type TransactionalDb } from '../db/db.types';
import { HealthModule } from '../health/health.module';
import { databaseProbe } from '../health/health.types';
import { createLoggerModule } from '../logger/logger.module';
import { EventConsumer } from '../messaging/event-consumer';
import { EventPublisher } from '../messaging/event-publisher';
import { MESSAGING_OPTIONS, type MessagingOptions, RabbitMqConnection } from '../messaging/rabbitmq.connection';
import { OutboxRelay, OUTBOX_RELAY_OPTIONS, type OutboxRelayOptions } from '../outbox/outbox.relay';
import { OutboxService } from '../outbox/outbox.service';
import { HealthRpcController, SERVICE_NAME } from './health-rpc.controller';

export interface ServiceCoreOptions {
  name: ServiceName;
  /** The service's PrismaService (extends its generated PrismaClient, implements TransactionalDb). */
  prisma: Type<TransactionalDb>;
  /** Must extend serviceEnvSchema; defaults to it. */
  envSchema?: z.ZodType<ServiceEnv>;
}

/**
 * Everything an internal service needs: typed config, pino logger, its Prisma client,
 * RabbitMQ publisher/consumer, transactional outbox + relay, HTTP /health and TCP health ping.
 * Global, so feature modules can inject OutboxService, EventConsumer and the PrismaService.
 */
@Global()
@Module({})
export class ServiceCoreModule {
  static forRoot(options: ServiceCoreOptions): DynamicModule {
    const shared = [
      { provide: SERVICE_NAME, useValue: options.name },
      options.prisma,
      { provide: TRANSACTIONAL_DB, useExisting: options.prisma },
      {
        provide: MESSAGING_OPTIONS,
        inject: [APP_CONFIG],
        useFactory: (config: ServiceEnv): MessagingOptions => ({
          url: config.RABBITMQ_URL,
          serviceName: options.name,
        }),
      },
      {
        provide: OUTBOX_RELAY_OPTIONS,
        inject: [APP_CONFIG],
        useFactory: (config: ServiceEnv): OutboxRelayOptions => ({
          pollIntervalMs: config.OUTBOX_POLL_INTERVAL_MS,
          batchSize: config.OUTBOX_BATCH_SIZE,
          autoStart: config.NODE_ENV !== 'test',
        }),
      },
      RabbitMqConnection,
      EventPublisher,
      EventConsumer,
      OutboxService,
      OutboxRelay,
    ];

    return {
      module: ServiceCoreModule,
      global: true,
      imports: [
        AppConfigModule.forRoot(options.envSchema ?? serviceEnvSchema),
        createLoggerModule(options.name),
        HealthModule.forRoot({
          inject: [TRANSACTIONAL_DB, RabbitMqConnection],
          probes: (db: TransactionalDb, rabbit: RabbitMqConnection) => [
            databaseProbe(db),
            {
              name: 'rabbitmq',
              check: () =>
                rabbit.isConnected()
                  ? Promise.resolve()
                  : Promise.reject(new Error('not connected')),
            },
          ],
        }),
      ],
      controllers: [HealthRpcController],
      providers: shared,
      exports: shared,
    };
  }
}
