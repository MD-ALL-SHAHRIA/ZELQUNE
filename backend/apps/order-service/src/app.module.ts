import { Module } from '@nestjs/common';
import { ServiceClientsModule, ServiceCoreModule } from '@zelqune/common';
import { CartService } from './carts/cart.service';
import { CART_SERVICE, CheckoutService } from './checkout/checkout.service';
import { CHECKOUT_PARTICIPANTS, RpcCheckoutParticipants } from './checkout/participants';
import { PrismaSagaStore, SAGA_STORE } from './checkout/saga.store';
import { orderEnvSchema } from './config/order-env';
import { OrderEventHandlers } from './orders/order.handlers';
import { OrderRpcController } from './orders/order.rpc.controller';
import { OrderService } from './orders/order.service';
import { CouponService } from './marketing/coupon.service';
import { PrismaService } from './prisma/prisma.service';
import { ReportRpcController } from './reports/report.rpc.controller';
import { ReportService } from './reports/report.service';
import { QuoteRpcController } from './quotes/quote.rpc.controller';
import { QuoteService } from './quotes/quote.service';

@Module({
  imports: [
    ServiceCoreModule.forRoot({
      name: 'order-service',
      prisma: PrismaService,
      envSchema: orderEnvSchema,
    }),
    ServiceClientsModule,
  ],
  controllers: [OrderRpcController, QuoteRpcController, ReportRpcController],
  providers: [
    CartService,
    { provide: CART_SERVICE, useExisting: CartService },
    { provide: CHECKOUT_PARTICIPANTS, useClass: RpcCheckoutParticipants },
    { provide: SAGA_STORE, useClass: PrismaSagaStore },
    CheckoutService,
    OrderService,
    OrderEventHandlers,
    QuoteService,
    ReportService,
    CouponService,
  ],
})
export class AppModule {}
