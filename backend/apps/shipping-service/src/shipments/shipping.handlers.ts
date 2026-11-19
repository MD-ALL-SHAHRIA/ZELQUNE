import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { EventConsumer } from '@zelqune/common';
import { orderCancelled } from '@zelqune/contracts';
import { type Prisma } from '../generated/prisma/client';
import { ShippingService } from './shipping.service';

@Injectable()
export class ShippingEventHandlers implements OnModuleInit {
  private readonly logger = new Logger(ShippingEventHandlers.name);

  constructor(
    private readonly consumer: EventConsumer,
    private readonly shipping: ShippingService,
  ) {}

  onModuleInit(): void {
    // A cancelled order's shipment is cancelled too, unless the parcel already left.
    this.consumer.subscribe(
      orderCancelled.type,
      'shipping.cancelOnOrderCancelled',
      async (event, tx) => {
        const { orderId, code, reason } = orderCancelled.parse(event).payload;
        const status = await this.shipping.cancelForOrder(
          { orderId, reason },
          tx as Prisma.TransactionClient,
        );
        if (status && status !== 'CANCELLED') {
          this.logger.warn(
            `Order ${code} cancelled but its shipment is ${status}: handle as a return`,
          );
        }
      },
    );
  }
}
