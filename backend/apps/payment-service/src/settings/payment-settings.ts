import { Controller, Inject, Injectable } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { APP_CONFIG, OutboxService, SettingsStore } from '@zelqune/common';
import {
  normalizeBdPhone,
  type PaymentSettings,
  paymentSettingsSchema,
  RPC_PATTERNS,
  type RpcRequest,
} from '@zelqune/contracts';
import { type PaymentEnv } from '../config/payment-env';
import { PrismaService } from '../prisma/prisma.service';

type AccountType = PaymentSettings['bkash']['accountType'];
const accountType = (v: string): AccountType =>
  v === 'agent' || v === 'merchant' ? v : 'personal';

/** bKash/Nagad receiving numbers: the owner's saved values, else PAYMENT_* env. */
@Injectable()
export class PaymentSettingsService extends SettingsStore<typeof paymentSettingsSchema> {
  constructor(prisma: PrismaService, outbox: OutboxService, @Inject(APP_CONFIG) c: PaymentEnv) {
    super(prisma, outbox, 'payment-service', 'payments', paymentSettingsSchema, () => ({
      bkash: {
        number: c.PAYMENT_BKASH_NUMBER ? normalizeBdPhone(c.PAYMENT_BKASH_NUMBER) : null,
        accountType: accountType(c.PAYMENT_BKASH_ACCOUNT_TYPE),
      },
      nagad: {
        number: c.PAYMENT_NAGAD_NUMBER ? normalizeBdPhone(c.PAYMENT_NAGAD_NUMBER) : null,
        accountType: accountType(c.PAYMENT_NAGAD_ACCOUNT_TYPE),
      },
    }));
  }
}

@Controller()
export class PaymentSettingsRpcController {
  constructor(private readonly settings: PaymentSettingsService) {}

  @MessagePattern(RPC_PATTERNS.payment.settings.get)
  get() {
    return this.settings.get();
  }

  @MessagePattern(RPC_PATTERNS.payment.settings.update)
  update(@Payload() req: RpcRequest<unknown>) {
    return this.settings.update(req.data);
  }
}
