import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { APP_CONFIG, AppError, requestContext } from '@zelqune/common';
import {
  type CheckoutRequest,
  checkoutRequestSchema,
  type CheckoutResponse,
  orderPlaced,
  type PaymentSummary,
} from '@zelqune/contracts';
import { randomUUID } from 'node:crypto';
import { type CartService, type PreparedCheckout } from '../carts/cart.service';
import { type OrderEnv } from '../config/order-env';
import { generateOrderCode } from '../domain/order-code';
import { paymentPlan } from '../domain/pricing';
import { CHECKOUT_PARTICIPANTS, type CheckoutParticipants } from './participants';
import { OrderCodeTakenError, SAGA_STORE, type SagaStore } from './saga.store';

export const CART_SERVICE = Symbol('CART_SERVICE');
const SOURCE = 'order-service';
const CODE_ATTEMPTS = 5;
const RECOVERY_BATCH = 20;

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));
/** Business rejections (4xx) need no compensation of the step that raised them. */
const isBusinessError = (err: unknown): boolean => err instanceof AppError && err.status < 500;

/**
 * Checkout saga orchestrator (ADR 0008):
 *   1. reserve stock (IN_STOCK only)          compensation: release stock
 *   2. create payment                          compensation: void payment
 *   3. create order + order.placed (one tx)    -> COMPLETED
 * Every step and compensation is idempotent per order id; unfinished sagas are compensated by
 * a recovery poller after SAGA_RECOVERY_AFTER_SECONDS.
 */
@Injectable()
export class CheckoutService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CheckoutService.name);
  private recoveryTimer?: NodeJS.Timeout;

  constructor(
    @Inject(CART_SERVICE) private readonly carts: Pick<CartService, 'loadActive' | 'prepare'>,
    @Inject(CHECKOUT_PARTICIPANTS) private readonly participants: CheckoutParticipants,
    @Inject(SAGA_STORE) private readonly store: SagaStore,
    @Inject(APP_CONFIG)
    private readonly config: Pick<
      OrderEnv,
      'NODE_ENV' | 'SAGA_RECOVERY_AFTER_SECONDS' | 'ORDER_SWEEP_INTERVAL_MS'
    >,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.NODE_ENV === 'test') return;
    this.recoveryTimer = setInterval(
      () => void this.recoverSafely(),
      this.config.ORDER_SWEEP_INTERVAL_MS,
    );
  }

  onModuleDestroy(): void {
    clearInterval(this.recoveryTimer);
  }

  async checkout(cartToken: string, raw: CheckoutRequest): Promise<CheckoutResponse> {
    const request = checkoutRequestSchema.parse(raw);
    const cart = await this.carts.loadActive(cartToken);
    const prepared = await this.carts.prepare(cart, request.address);
    const plan = paymentPlan(
      prepared.saleMode,
      request.paymentMethod,
      prepared.totals,
      prepared.allowedMethods,
    );

    const orderId = randomUUID();
    const code = await this.startSaga(orderId, cart.id);
    let status: 'STARTED' | 'STOCK_RESERVED' = 'STARTED';

    // Step 1: reserve stock (pre-orders and made-to-order skip it).
    const reserveStock = prepared.saleMode === 'IN_STOCK';
    if (reserveStock) {
      try {
        await this.participants.reserveStock({
          orderId,
          items: prepared.lines.map(({ variantId, qty }) => ({ variantId, qty })),
        });
        await this.mustAdvance(orderId, 'STARTED', 'STOCK_RESERVED', { stockReserved: true });
        status = 'STOCK_RESERVED';
      } catch (err) {
        if (isBusinessError(err)) await this.store.fail(orderId, message(err));
        else await this.compensate(orderId, err);
        throw err;
      }
    }

    // Step 2: create the payment.
    let payment: PaymentSummary;
    try {
      payment = await this.participants.createPayment({
        orderId,
        orderCode: code,
        method: request.paymentMethod,
        kind: plan.kind,
        amountPaisa: plan.amountPaisa,
        trxId: request.trxId,
        payerPhone:
          request.payerPhone ?? (request.paymentMethod === 'COD' ? null : request.customer.phone),
      });
      await this.mustAdvance(orderId, status, 'PAYMENT_CREATED', { paymentCreated: true });
    } catch (err) {
      await this.compensate(orderId, err);
      throw err;
    }

    // Step 3: the order and its event, atomically.
    try {
      await this.store.complete(
        orderId,
        this.orderDraft(orderId, code, cart.id, request, prepared),
        this.placedEvent(orderId, code, request, prepared, reserveStock),
      );
    } catch (err) {
      await this.compensate(orderId, err);
      if (err instanceof AppError) throw err;
      throw new AppError(
        'CHECKOUT_FAILED',
        'Checkout could not be completed, please try again',
        503,
      );
    }

    return {
      orderCode: code,
      status: 'PENDING_PAYMENT',
      saleMode: prepared.saleMode,
      totals: prepared.totals,
      payment,
    };
  }

  /** Releases stock and voids the payment (both idempotent), then marks the saga COMPENSATED. */
  async compensate(orderId: string, cause: unknown): Promise<boolean> {
    const saga = await this.store.beginCompensation(orderId, message(cause));
    if (!saga) return false;
    try {
      await this.participants.voidPayment({ orderId, reason: 'COMPENSATION' });
      await this.participants.releaseStock({ orderId, reason: 'COMPENSATION' });
      await this.store.finishCompensation(orderId);
      return true;
    } catch (err) {
      // Stays COMPENSATING; the recovery poller retries.
      this.logger.error({ err, orderId }, 'Compensation failed; will retry');
      return false;
    }
  }

  /** Compensates sagas left unfinished (crash, timeout) for longer than the recovery window. */
  async recoverStale(now = new Date()): Promise<number> {
    const before = new Date(now.getTime() - this.config.SAGA_RECOVERY_AFTER_SECONDS * 1000);
    const stale = await this.store.findStale(before, RECOVERY_BATCH);
    let recovered = 0;
    for (const saga of stale) {
      if (await this.compensate(saga.id, new Error(`recovered stale saga in ${saga.status}`)))
        recovered++;
    }
    return recovered;
  }

  private async recoverSafely(): Promise<void> {
    try {
      const n = await this.recoverStale();
      if (n > 0) this.logger.warn(`Compensated ${n} stale checkout saga(s)`);
    } catch (err) {
      this.logger.error({ err }, 'Saga recovery failed');
    }
  }

  private async startSaga(orderId: string, cartId: string): Promise<string> {
    for (let attempt = 1; attempt <= CODE_ATTEMPTS; attempt++) {
      const code = generateOrderCode();
      try {
        await this.store.start({ id: orderId, cartId, code });
        return code;
      } catch (err) {
        if (!(err instanceof OrderCodeTakenError)) throw err;
      }
    }
    throw new AppError(
      'CHECKOUT_FAILED',
      'Could not allocate an order code, please try again',
      503,
    );
  }

  private async mustAdvance(...args: Parameters<SagaStore['advance']>): Promise<void> {
    if (!(await this.store.advance(...args))) {
      throw new AppError('CHECKOUT_ABORTED', 'Checkout was interrupted, please try again', 409);
    }
  }

  private orderDraft(
    orderId: string,
    code: string,
    cartId: string,
    request: ReturnType<typeof checkoutRequestSchema.parse>,
    p: PreparedCheckout,
  ) {
    return {
      id: orderId,
      code,
      cartId,
      customerName: request.customer.name,
      customerPhone: request.customer.phone,
      address: request.address,
      saleMode: p.saleMode,
      status: 'PENDING_PAYMENT' as const,
      paymentMethod: request.paymentMethod,
      ...p.totals,
      shippingZone: p.shipping.zone,
      chargeableWeightGrams: p.shipping.chargeableWeightGrams,
      experimentKey: p.cart.experimentKey,
      utm: request.utm ?? undefined,
      items: p.lines.map((l) => ({
        variantId: l.variantId,
        productId: l.snapshot.productId,
        sku: l.snapshot.sku,
        nameBn: l.snapshot.nameBn,
        nameEn: l.snapshot.nameEn,
        options: l.snapshot.options,
        saleMode: l.snapshot.saleMode,
        unitPricePaisa: l.unitPricePaisa,
        qty: l.qty,
        lineTotalPaisa: l.unitPricePaisa * l.qty,
      })),
    };
  }

  private placedEvent(
    orderId: string,
    code: string,
    request: ReturnType<typeof checkoutRequestSchema.parse>,
    p: PreparedCheckout,
    stockReserved: boolean,
  ) {
    return orderPlaced.create(
      {
        orderId,
        code,
        saleMode: p.saleMode,
        items: p.lines.map((l) => ({
          variantId: l.variantId,
          sku: l.snapshot.sku,
          qty: l.qty,
          unitPricePaisa: l.unitPricePaisa,
        })),
        subtotalPaisa: p.totals.subtotalPaisa,
        shippingFeePaisa: p.totals.shippingFeePaisa,
        totalPaisa: p.totals.totalPaisa,
        advanceRequiredPaisa: p.totals.advanceRequiredPaisa,
        paymentMethod: request.paymentMethod,
        experimentKey:
          p.cart.experimentKey === 'a' || p.cart.experimentKey === 'b'
            ? p.cart.experimentKey
            : null,
        stockReserved,
      },
      { source: SOURCE, requestId: requestContext.requestId() },
    );
  }
}
