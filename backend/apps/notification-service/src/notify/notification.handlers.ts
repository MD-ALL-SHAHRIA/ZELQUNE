import { Injectable, type OnModuleInit } from '@nestjs/common';
import { EventConsumer } from '@zelqune/common';
import {
  orderCancelled,
  orderConfirmed,
  orderPlaced,
  paymentVerified,
  privacyErased,
  quoteRequested,
} from '@zelqune/contracts';
import { type Prisma } from '../generated/prisma/client';
import { NotificationService } from './notification.service';

@Injectable()
export class NotificationEventHandlers implements OnModuleInit {
  constructor(
    private readonly consumer: EventConsumer,
    private readonly notifications: NotificationService,
  ) {}

  onModuleInit(): void {
    const n = this.notifications;
    const tx = (t: unknown) => t as Prisma.TransactionClient;
    this.consumer.subscribe(privacyErased.type, 'notification.privacyErased', (e, t) =>
      n.onPrivacyErased(e, tx(t)),
    );
    this.consumer.subscribe(orderPlaced.type, 'notification.orderPlaced', (e, t) =>
      n.onOrderPlaced(e, tx(t)),
    );
    this.consumer.subscribe(paymentVerified.type, 'notification.paymentVerified', (e, t) =>
      n.onPaymentVerified(e, tx(t)),
    );
    this.consumer.subscribe(orderConfirmed.type, 'notification.orderConfirmed', (e, t) =>
      n.onOrderConfirmed(e, tx(t)),
    );
    this.consumer.subscribe(orderCancelled.type, 'notification.orderCancelled', (e, t) =>
      n.onOrderCancelled(e, tx(t)),
    );
    this.consumer.subscribe(quoteRequested.type, 'notification.quoteRequested', (e, t) =>
      n.onQuoteRequested(e, tx(t)),
    );
  }
}
