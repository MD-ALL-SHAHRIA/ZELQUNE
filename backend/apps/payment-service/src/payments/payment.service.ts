import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, AppError, OutboxService, recordAudit, requestContext } from '@zelqune/common';
import {
  normalizeBdPhone,
  confirmCodInputSchema,
  type ConfirmCodInput,
  createPaymentRequestSchema,
  type CreatePaymentRequest,
  type PaymentInstructions,
  paymentSubmitted,
  type PaymentSummary,
  paymentVerified,
  rejectPaymentInputSchema,
  verifyPaymentInputSchema,
  type VerifyPaymentInput,
  voidPaymentRequestSchema,
} from '@zelqune/contracts';
import { type z } from 'zod';
import { type PaymentEnv } from '../config/payment-env';
import { Prisma, type Payment, type PaymentStatus } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentSettingsService } from '../settings/payment-settings';
import { canTransitionPayment, OPEN_PAYMENT_STATUSES } from './payment-state';
import { PAYMENT_PROVIDERS, type PaymentProvider } from './payment.provider';

type Tx = Prisma.TransactionClient;
const SOURCE = 'payment-service';

export function toSummary(p: Payment): PaymentSummary {
  return {
    id: p.id,
    method: p.method,
    kind: p.kind,
    status: p.status,
    amountPaisa: p.amountPaisa,
    trxIdLast4: p.trxId ? p.trxId.slice(-4) : null,
  };
}

const isUniqueViolation = (err: unknown, field: string): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError &&
  err.code === 'P2002' &&
  JSON.stringify(err.meta ?? {}).includes(field);

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
    @Inject(PAYMENT_PROVIDERS) private readonly providers: PaymentProvider[],
    @Inject(APP_CONFIG) private readonly config: PaymentEnv,
    private readonly settings: PaymentSettingsService,
  ) {}

  /** Where to send manual payments (dashboard settings, else env); numbers shown as 01XXXXXXXXX. */
  async instructions(): Promise<PaymentInstructions> {
    const { bkash, nagad } = await this.settings.value();
    const local = (n: string) => `0${(normalizeBdPhone(n) ?? n).replace(/^\+880/, '')}`;
    return {
      bkash: bkash.number ? { number: local(bkash.number), accountType: bkash.accountType } : null,
      nagad: nagad.number ? { number: local(nagad.number), accountType: nagad.accountType } : null,
    };
  }

  /**
   * Saga step: creates the order's payment. Idempotent per order (a retry returns the open
   * payment). A trxId already used by another payment -> 409 TRX_ID_ALREADY_USED.
   */
  async create(raw: CreatePaymentRequest): Promise<PaymentSummary> {
    const input = createPaymentRequestSchema.parse(raw);
    const provider = this.providers.find((p) => p.methods.includes(input.method));
    if (!provider)
      throw new AppError('PAYMENT_METHOD_UNAVAILABLE', `${input.method} is not available`, 422);
    const start = provider.begin(input);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const open = await tx.payment.findFirst({
          where: { orderId: input.orderId, status: { in: [...OPEN_PAYMENT_STATUSES] } },
        });
        if (open) {
          if (
            open.method !== input.method ||
            open.amountPaisa !== input.amountPaisa ||
            open.trxId !== input.trxId
          ) {
            throw new AppError(
              'PAYMENT_ALREADY_EXISTS',
              'This order already has a different payment',
              409,
            );
          }
          return toSummary(open);
        }
        const payment = await tx.payment.create({
          data: {
            orderId: input.orderId,
            orderCode: input.orderCode,
            method: input.method,
            kind: input.kind,
            status: start.status,
            amountPaisa: input.amountPaisa,
            trxId: input.trxId,
            payerPhone: input.payerPhone,
            history: { create: { from: null, to: start.status, actor: 'customer' } },
          },
        });
        await this.outbox.add(
          tx,
          paymentSubmitted.create(
            {
              paymentId: payment.id,
              orderId: payment.orderId,
              orderCode: payment.orderCode,
              method: payment.method,
              kind: payment.kind,
              amountPaisa: payment.amountPaisa,
              trxId: payment.trxId,
            },
            { source: SOURCE, requestId: requestContext.requestId() },
          ),
        );
        return toSummary(payment);
      });
    } catch (err) {
      if (isUniqueViolation(err, 'trx_id')) {
        throw new AppError('TRX_ID_ALREADY_USED', 'This transaction ID has already been used', 409);
      }
      throw err;
    }
  }

  /** Compensation / cancellation: voids the open payment (frees its trxId). Idempotent. */
  async voidForOrder(
    raw: z.input<typeof voidPaymentRequestSchema>,
    tx?: Tx,
  ): Promise<{ voided: boolean }> {
    const { orderId, reason } = voidPaymentRequestSchema.parse(raw);
    return this.inTx(tx, async (t) => {
      await t.$queryRaw`SELECT id FROM payments WHERE order_id = ${orderId}::uuid FOR UPDATE`;
      const open = await t.payment.findFirst({
        where: { orderId, status: { in: [...OPEN_PAYMENT_STATUSES] } },
      });
      if (!open) return { voided: false };
      await this.transition(t, open, 'VOID', 'system', reason, {
        voidReason: reason,
        trxId: null,
        voidedTrxId: open.trxId,
      });
      return { voided: true };
    });
  }

  async summaryByOrder(orderId: string): Promise<PaymentSummary | null> {
    const p = await this.prisma.payment.findFirst({
      where: { orderId, status: { not: 'VOID' } },
      orderBy: { createdAt: 'desc' },
    });
    return p ? toSummary(p) : null;
  }

  /** Admin: the trxId arrived with the expected amount -> VERIFIED, emits payment.verified. */
  async verify(raw: VerifyPaymentInput): Promise<PaymentSummary> {
    const input = verifyPaymentInputSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      const payment = await this.lock(tx, input.paymentId);
      if (payment.method === 'COD')
        throw new AppError('INVALID_PAYMENT_METHOD', 'Use confirm-COD for COD payments', 422);
      if (input.amountReceivedPaisa !== payment.amountPaisa) {
        throw new AppError(
          'AMOUNT_MISMATCH',
          `Expected ${payment.amountPaisa} paisa, received ${input.amountReceivedPaisa}`,
          422,
        );
      }
      const verifiedAt = new Date();
      const updated = await this.transition(tx, payment, 'VERIFIED', input.verifiedBy, null, {
        verifiedBy: input.verifiedBy,
        verifiedAt,
        amountReceivedPaisa: input.amountReceivedPaisa,
      });
      await this.emitVerified(tx, updated, input.verifiedBy, verifiedAt);
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'payment.verify',
        entityType: 'payment',
        entityId: payment.id,
        summary: `${payment.orderCode}: ${payment.method} ${payment.amountPaisa} paisa verified`,
        changes: {
          amountReceivedPaisa: input.amountReceivedPaisa,
          trxIdLast4: payment.trxId?.slice(-4) ?? null,
        },
      });
      return toSummary(updated);
    });
  }

  /** Admin: confirmed with the customer by phone -> COD_CONFIRMED, emits payment.verified. */
  async confirmCod(raw: ConfirmCodInput): Promise<PaymentSummary> {
    const input = confirmCodInputSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      const payment = await this.lock(tx, input.paymentId);
      const verifiedAt = new Date();
      const updated = await this.transition(tx, payment, 'COD_CONFIRMED', input.confirmedBy, null, {
        verifiedBy: input.confirmedBy,
        verifiedAt,
      });
      await this.emitVerified(tx, updated, input.confirmedBy, verifiedAt);
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'payment.confirmCod',
        entityType: 'payment',
        entityId: payment.id,
        summary: `${payment.orderCode}: COD ${payment.amountPaisa} paisa confirmed with customer`,
        changes: null,
      });
      return toSummary(updated);
    });
  }

  /** Admin: the trxId did not arrive or the amount was wrong. The trxId stays blocked. */
  async reject(raw: z.input<typeof rejectPaymentInputSchema>): Promise<PaymentSummary> {
    const input = rejectPaymentInputSchema.parse(raw);
    return this.prisma.$transaction(async (tx) => {
      const payment = await this.lock(tx, input.paymentId);
      const updated = await this.transition(
        tx,
        payment,
        'REJECTED',
        input.rejectedBy,
        input.reason,
        {
          rejectionReason: input.reason,
        },
      );
      await recordAudit(this.outbox, tx, SOURCE, {
        action: 'payment.reject',
        entityType: 'payment',
        entityId: payment.id,
        summary: `${payment.orderCode}: ${payment.method} payment rejected (${input.reason})`,
        changes: { reason: input.reason },
      });
      return toSummary(updated);
    });
  }

  private async emitVerified(tx: Tx, p: Payment, by: string, at: Date): Promise<void> {
    await this.outbox.add(
      tx,
      paymentVerified.create(
        {
          paymentId: p.id,
          orderId: p.orderId,
          orderCode: p.orderCode,
          method: p.method,
          kind: p.kind,
          amountPaisa: p.amountPaisa,
          verifiedBy: by,
          verifiedAt: at.toISOString(),
        },
        { source: SOURCE, requestId: requestContext.requestId() },
      ),
    );
  }

  private async transition(
    tx: Tx,
    payment: Payment,
    to: PaymentStatus,
    actor: string,
    note: string | null,
    data: Prisma.PaymentUpdateInput = {},
  ): Promise<Payment> {
    if (!canTransitionPayment(payment.status, to)) {
      throw new AppError(
        'INVALID_PAYMENT_TRANSITION',
        `Payment is ${payment.status}, cannot become ${to}`,
        409,
      );
    }
    return tx.payment.update({
      where: { id: payment.id },
      data: { ...data, status: to, history: { create: { from: payment.status, to, actor, note } } },
    });
  }

  private async lock(tx: Tx, paymentId: string): Promise<Payment> {
    await tx.$queryRaw`SELECT id FROM payments WHERE id = ${paymentId}::uuid FOR UPDATE`;
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new AppError('PAYMENT_NOT_FOUND', 'Payment not found', 404);
    return payment;
  }

  private inTx<T>(tx: Tx | undefined, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return tx ? fn(tx) : this.prisma.$transaction(fn);
  }
}
