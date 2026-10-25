import { Controller, Inject, Injectable } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { APP_CONFIG, OutboxService, SettingsStore } from '@zelqune/common';
import { checkoutSettingsSchema, RPC_PATTERNS, type RpcRequest } from '@zelqune/contracts';
import { type OrderEnv } from '../config/order-env';
import { type AdvancePolicy } from '../domain/pricing';
import { PrismaService } from '../prisma/prisma.service';

/** The pre-order advance: the owner's saved policy, else ADVANCE_* env. */
@Injectable()
export class CheckoutSettingsService extends SettingsStore<typeof checkoutSettingsSchema> {
  constructor(prisma: PrismaService, outbox: OutboxService, @Inject(APP_CONFIG) c: OrderEnv) {
    super(prisma, outbox, 'order-service', 'checkout', checkoutSettingsSchema, () => ({
      advanceMode: c.ADVANCE_MODE,
      advanceFixedPaisa: c.ADVANCE_FIXED_PAISA,
      advancePercent: c.ADVANCE_PERCENT ?? 100,
    }));
  }

  async advancePolicy(): Promise<AdvancePolicy> {
    const s = await this.value();
    return s.advanceMode === 'percent'
      ? { mode: 'percent', percent: s.advancePercent }
      : { mode: 'fixed', fixedPaisa: s.advanceFixedPaisa };
  }
}

@Controller()
export class CheckoutSettingsRpcController {
  constructor(private readonly settings: CheckoutSettingsService) {}

  @MessagePattern(RPC_PATTERNS.order.settings.get)
  get() {
    return this.settings.get();
  }

  @MessagePattern(RPC_PATTERNS.order.settings.update)
  update(@Payload() req: RpcRequest<unknown>) {
    return this.settings.update(req.data);
  }
}
