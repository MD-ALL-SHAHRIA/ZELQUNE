import { Injectable, type OnModuleInit } from '@nestjs/common';
import { EventConsumer, type EventHandler } from '@zelqune/common';
import {
  auditRecorded,
  customerFriendFlagChanged,
  orderCancelled,
  orderConfirmed,
  orderPlaced,
  orderStatusChanged,
  paymentVerified,
} from '@zelqune/contracts';
import { type Prisma } from '../generated/prisma/client';
import { ProjectionsService } from './projections.service';

@Injectable()
export class AnalyticsEventHandlers implements OnModuleInit {
  constructor(
    private readonly consumer: EventConsumer,
    private readonly projections: ProjectionsService,
  ) {}

  onModuleInit(): void {
    const on = (
      type: string,
      name: string,
      fn: (e: Parameters<EventHandler>[0], tx: Prisma.TransactionClient) => Promise<void>,
    ) =>
      this.consumer.subscribe(type, `analytics.${name}`, (event, tx) =>
        fn(event, tx as Prisma.TransactionClient),
      );
    on(orderPlaced.type, 'projectOrderPlaced', (e, tx) => this.projections.onOrderPlaced(e, tx));
    on(orderConfirmed.type, 'projectOrderConfirmed', (e, tx) =>
      this.projections.onOrderConfirmed(e, tx),
    );
    on(orderStatusChanged.type, 'projectOrderStatus', (e, tx) =>
      this.projections.onOrderStatusChanged(e, tx),
    );
    on(orderCancelled.type, 'projectOrderCancelled', (e, tx) =>
      this.projections.onOrderCancelled(e, tx),
    );
    on(paymentVerified.type, 'projectPaymentVerified', (e, tx) =>
      this.projections.onPaymentVerified(e, tx),
    );
    on(customerFriendFlagChanged.type, 'projectFriendFlag', (e, tx) =>
      this.projections.onFriendFlagChanged(e, tx),
    );
    on(auditRecorded.type, 'storeAuditEntry', (e, tx) => this.projections.onAuditRecorded(e, tx));
  }
}
