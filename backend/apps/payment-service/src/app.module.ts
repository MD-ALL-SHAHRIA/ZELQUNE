import { Module } from '@nestjs/common';
import { ServiceCoreModule } from '@zelqune/common';
import { paymentEnvSchema } from './config/payment-env';
import {
  CodPaymentProvider,
  ManualMobilePaymentProvider,
  PAYMENT_PROVIDERS,
} from './payments/payment.provider';
import { PaymentEventHandlers } from './payments/payment.handlers';
import { PaymentRpcController } from './payments/payment.rpc.controller';
import { PaymentService } from './payments/payment.service';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    ServiceCoreModule.forRoot({
      name: 'payment-service',
      prisma: PrismaService,
      envSchema: paymentEnvSchema,
    }),
  ],
  controllers: [PaymentRpcController],
  providers: [
    PaymentService,
    PaymentEventHandlers,
    // Gateway providers (SSLCommerz, bKash PGW) are added here in M3.
    {
      provide: PAYMENT_PROVIDERS,
      useValue: [new ManualMobilePaymentProvider(), new CodPaymentProvider()],
    },
  ],
})
export class AppModule {}
