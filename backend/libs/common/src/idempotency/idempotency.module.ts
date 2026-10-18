import { type DynamicModule, type InjectionToken, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import {
  IDEMPOTENCY_OPTIONS,
  IdempotencyInterceptor,
  type IdempotencyOptions,
} from './idempotency.interceptor';
import { IDEMPOTENCY_STORE, type IdempotencyStore } from './idempotency.store';

export interface IdempotencyModuleOptions extends Partial<IdempotencyOptions> {
  inject?: InjectionToken[];
  store: (...deps: never[]) => IdempotencyStore;
}

/** Registers IdempotencyInterceptor globally; it only acts on routes marked `@Idempotent()`. */
@Module({})
export class IdempotencyModule {
  static forRoot(options: IdempotencyModuleOptions): DynamicModule {
    const resolved: IdempotencyOptions = {
      ttlSeconds: options.ttlSeconds ?? 24 * 60 * 60,
      lockTtlSeconds: options.lockTtlSeconds ?? 60,
    };
    return {
      module: IdempotencyModule,
      providers: [
        { provide: IDEMPOTENCY_OPTIONS, useValue: resolved },
        {
          provide: IDEMPOTENCY_STORE,
          inject: options.inject ?? [],
          useFactory: options.store as (...deps: unknown[]) => IdempotencyStore,
        },
        { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
      ],
      exports: [IDEMPOTENCY_STORE],
    };
  }
}
