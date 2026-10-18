import { type DynamicModule, type InjectionToken, Module, type ModuleMetadata } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { HEALTH_PROBES, type HealthProbe } from './health.types';

export interface HealthModuleOptions {
  imports?: ModuleMetadata['imports'];
  inject?: InjectionToken[];
  probes: (...deps: never[]) => HealthProbe[];
}

/** Exposes GET /health running every probe (each with a 2s timeout); 200 when all up, 503 otherwise. */
@Module({})
export class HealthModule {
  static forRoot(options: HealthModuleOptions): DynamicModule {
    return {
      module: HealthModule,
      imports: [TerminusModule.forRoot({ logger: false }), ...(options.imports ?? [])],
      controllers: [HealthController],
      providers: [
        {
          provide: HEALTH_PROBES,
          inject: options.inject ?? [],
          useFactory: options.probes as (...deps: unknown[]) => HealthProbe[],
        },
      ],
    };
  }
}
