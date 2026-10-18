import { type DynamicModule, Global, Inject, Module } from '@nestjs/common';
import { type z } from 'zod';
import { parseEnv } from './env';

export const APP_CONFIG = Symbol('APP_CONFIG');

/** Injects the validated, typed config: `constructor(@InjectConfig() config: ServiceEnv)`. */
export const InjectConfig = (): ParameterDecorator => Inject(APP_CONFIG);

@Global()
@Module({})
export class AppConfigModule {
  static forRoot(schema: z.ZodType, env?: NodeJS.ProcessEnv): DynamicModule {
    const provider = {
      provide: APP_CONFIG,
      useFactory: (): unknown => parseEnv(schema, env ?? process.env),
    };
    return { module: AppConfigModule, global: true, providers: [provider], exports: [provider] };
  }
}
