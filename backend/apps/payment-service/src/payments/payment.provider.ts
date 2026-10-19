import { AppError } from '@zelqune/common';
import { type PaymentKind, type PaymentMethod, type PaymentStatus } from '@zelqune/contracts';

export interface NewPayment {
  method: PaymentMethod;
  kind: PaymentKind;
  amountPaisa: number;
  trxId: string | null;
}

export interface PaymentStart {
  status: PaymentStatus;
  /** For hosted gateways (M3): where to send the customer. */
  redirectUrl?: string;
}

/**
 * Payment method integration point. M1: manual bKash/Nagad (customer sends money, enters the
 * trxId, staff verify) and COD. SSLCommerz / bKash PGW providers plug in here in M3.
 */
export interface PaymentProvider {
  readonly methods: readonly PaymentMethod[];
  begin(payment: NewPayment): PaymentStart;
}

export const PAYMENT_PROVIDERS = Symbol('PAYMENT_PROVIDERS');

export class ManualMobilePaymentProvider implements PaymentProvider {
  readonly methods = ['BKASH_MANUAL', 'NAGAD_MANUAL'] as const;

  begin({ trxId, kind }: NewPayment): PaymentStart {
    if (!trxId) throw new AppError('TRX_ID_REQUIRED', 'Transaction ID is required', 422);
    if (kind === 'COD')
      throw new AppError('INVALID_PAYMENT_KIND', 'Manual payments are ADVANCE or FULL', 422);
    return { status: 'SUBMITTED' };
  }
}

export class CodPaymentProvider implements PaymentProvider {
  readonly methods = ['COD'] as const;

  begin({ trxId, kind }: NewPayment): PaymentStart {
    if (trxId) throw new AppError('INVALID_PAYMENT', 'COD payments have no transaction ID', 422);
    if (kind !== 'COD')
      throw new AppError('INVALID_PAYMENT_KIND', 'COD payments must be kind COD', 422);
    return { status: 'COD_PENDING' };
  }
}

/** Test double: records what it was asked to start. */
export class FakePaymentProvider implements PaymentProvider {
  readonly started: NewPayment[] = [];
  constructor(
    readonly methods: readonly PaymentMethod[],
    private readonly status: PaymentStatus = 'SUBMITTED',
  ) {}

  begin(payment: NewPayment): PaymentStart {
    this.started.push(payment);
    return { status: this.status };
  }
}
