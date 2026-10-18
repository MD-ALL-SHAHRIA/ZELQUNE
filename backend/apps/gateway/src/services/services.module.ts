import { Global, Module } from '@nestjs/common';
import { ServiceRegistry } from './service-registry';

@Global()
@Module({ providers: [ServiceRegistry], exports: [ServiceRegistry] })
export class ServicesModule {}
