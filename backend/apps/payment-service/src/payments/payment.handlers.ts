import { Injectable, type OnModuleInit } from '@nestjs/common';
import { EventConsumer } from '@zelqune/common';
import { orderCancelled, privacyErased } from '@zelqune/contracts';
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
    // Erasure (ADR 0020): orders where no money moved lose the paying number. Payments of
    // retained sales are untouched (accounting record).
    this.consumer.subscribe(privacyErased.type, 'payment.privacyErased', async (event, tx) => {
      const { erasedOrderIds } = privacyErased.parse(event).payload;
      if (!erasedOrderIds.length) return;
      await (tx as Prisma.TransactionClient).payment.updateMany({
        where: { orderId: { in: erasedOrderIds } },
        data: { payerPhone: null },
      });
    });
  }
}
