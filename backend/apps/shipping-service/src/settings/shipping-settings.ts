import { Controller, Inject, Injectable } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { APP_CONFIG, OutboxService, SettingsStore } from '@zelqune/common';
import { RPC_PATTERNS, type RpcRequest, shippingSettingsSchema } from '@zelqune/contracts';
import { type ShippingEnv } from '../config/shipping-env';
import { PrismaService } from '../prisma/prisma.service';

/** Delivery fees by zone and per extra kg: the owner's saved values, else SHIPPING_* env. */
@Injectable()
export class ShippingSettingsService extends SettingsStore<typeof shippingSettingsSchema> {
  constructor(prisma: PrismaService, outbox: OutboxService, @Inject(APP_CONFIG) c: ShippingEnv) {
    super(prisma, outbox, 'shipping-service', 'shipping', shippingSettingsSchema, () => ({
      dhakaFeePaisa: c.SHIPPING_FEE_DHAKA_PAISA,
      suburbFeePaisa: c.SHIPPING_FEE_SUBURB_PAISA,
      outsideFeePaisa: c.SHIPPING_FEE_OUTSIDE_PAISA,
      baseWeightGrams: c.SHIPPING_BASE_WEIGHT_GRAMS,
      extraPerKgPaisa: c.SHIPPING_EXTRA_PER_KG_PAISA,
    }));
  }
}

@Controller()
export class ShippingSettingsRpcController {
  constructor(private readonly settings: ShippingSettingsService) {}

  @MessagePattern(RPC_PATTERNS.shipping.settings.get)
  get() {
    return this.settings.get();
  }

  @MessagePattern(RPC_PATTERNS.shipping.settings.update)
  update(@Payload() req: RpcRequest<unknown>) {
    return this.settings.update(req.data);
  }
}
