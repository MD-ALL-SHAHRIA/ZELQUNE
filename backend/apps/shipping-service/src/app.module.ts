import { Module } from '@nestjs/common';
import { ServiceCoreModule } from '@zelqune/common';
import { shippingEnvSchema } from './config/shipping-env';
import { PrismaService } from './prisma/prisma.service';
import { COURIER_PROVIDERS, ManualCourierProvider } from './shipments/courier.provider';
import { ShippingRpcController } from './shipments/shipping.rpc.controller';
import { ShippingService } from './shipments/shipping.service';

@Module({
  imports: [
    ServiceCoreModule.forRoot({
      name: 'shipping-service',
      prisma: PrismaService,
      envSchema: shippingEnvSchema,
    }),
  ],
  controllers: [ShippingRpcController],
  providers: [
    ShippingService,
    // Add courier API providers here in M3.
    { provide: COURIER_PROVIDERS, useValue: [new ManualCourierProvider()] },
  ],
})
export class AppModule {}
