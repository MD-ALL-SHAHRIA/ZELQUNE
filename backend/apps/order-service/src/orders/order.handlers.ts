import { Injectable, type OnModuleInit } from '@nestjs/common';
import { EventConsumer } from '@zelqune/common';
import { paymentVerified, stockReleased } from '@zelqune/contracts';
import { type Prisma } from '../generated/prisma/client';
import { OrderService } from './order.service';

@Injectable()
export class OrderEventHandlers implements OnModuleInit {
  constructor(
    private readonly consumer: EventConsumer,
    private readonly orders: OrderService,
  ) {}

  onModuleInit(): void {
    this.consumer.subscribe(
      paymentVerified.type,
      'order.confirmOnPaymentVerified',
      async (event, tx) => {
        await this.orders.confirmFromPayment(
          paymentVerified.parse(event).payload.orderId,
          tx as Prisma.TransactionClient,
        );
      },
    );
    this.consumer.subscribe(
      stockReleased.type,
      'order.cancelOnStockHoldExpired',
      async (event, tx) => {
        const { orderId, reason } = stockReleased.parse(event).payload;
        if (reason === 'EXPIRED')
          await this.orders.cancelIfPending(
            orderId,
            'STOCK_HOLD_EXPIRED',
            tx as Prisma.TransactionClient,
          );
      },
    );
  }
}
