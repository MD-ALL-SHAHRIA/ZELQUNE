import { Injectable, type OnModuleInit } from '@nestjs/common';
import { EventConsumer } from '@zelqune/common';
import { orderCancelled, orderConfirmed, orderPlaced } from '@zelqune/contracts';
import { type Prisma } from '../generated/prisma/client';
import { InventoryService } from './inventory.service';

/** Reacts to the order lifecycle. Each handler runs in the dedupe transaction (exactly-once effect). */
@Injectable()
export class InventoryEventHandlers implements OnModuleInit {
  constructor(
    private readonly consumer: EventConsumer,
    private readonly inventory: InventoryService,
  ) {}

  onModuleInit(): void {
    this.consumer.subscribe(orderPlaced.type, 'inventory.holdOnOrderPlaced', async (event, tx) => {
      const { orderId, stockReserved } = orderPlaced.parse(event).payload;
      if (stockReserved) await this.inventory.hold(orderId, tx as Prisma.TransactionClient);
    });
    this.consumer.subscribe(
      orderConfirmed.type,
      'inventory.commitOnOrderConfirmed',
      async (event, tx) => {
        await this.inventory.commit(
          orderConfirmed.parse(event).payload.orderId,
          tx as Prisma.TransactionClient,
        );
      },
    );
    this.consumer.subscribe(
      orderCancelled.type,
      'inventory.releaseOnOrderCancelled',
      async (event, tx) => {
        await this.inventory.release(
          { orderId: orderCancelled.parse(event).payload.orderId, reason: 'ORDER_CANCELLED' },
          tx as Prisma.TransactionClient,
        );
      },
    );
  }
}
