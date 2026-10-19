import { Injectable, type OnModuleInit } from '@nestjs/common';
import { EventConsumer } from '@zelqune/common';
import { orderCancelled } from '@zelqune/contracts';
import { type Prisma } from '../generated/prisma/client';
import { PaymentService } from './payment.service';

@Injectable()
export class PaymentEventHandlers implements OnModuleInit {
  constructor(
    private readonly consumer: EventConsumer,
    private readonly payments: PaymentService,
  ) {}

  onModuleInit(): void {
    // A cancelled order's open payment is voided (verified advances stay for refund handling).
    this.consumer.subscribe(
      orderCancelled.type,
      'payment.voidOnOrderCancelled',
      async (event, tx) => {
        const { orderId, reason } = orderCancelled.parse(event).payload;
        await this.payments.voidForOrder(
          { orderId, reason: `ORDER_CANCELLED:${reason}` },
          tx as Prisma.TransactionClient,
        );
      },
    );
  }
}
