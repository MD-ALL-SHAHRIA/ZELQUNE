import { Injectable } from '@nestjs/common';
import { ServiceRegistry } from '@zelqune/common';
import {
  type CheckoutSnapshotResponse,
  type CreatePaymentRequest,
  type PaymentInstructions,
  type PaymentSummary,
  type ReleaseStockRequest,
  type ReservationView,
  type ReserveStockRequest,
  RPC_PATTERNS,
  type ShippingQuote,
  type ShippingQuoteRequest,
} from '@zelqune/contracts';

/** Everything the checkout saga needs from other services (faked in unit tests). */
export interface CheckoutParticipants {
  snapshot(variantIds: string[], p: string | null): Promise<CheckoutSnapshotResponse>;
  quoteShipping(request: ShippingQuoteRequest): Promise<ShippingQuote>;
  paymentInstructions(): Promise<PaymentInstructions>;
  reserveStock(request: ReserveStockRequest): Promise<ReservationView>;
  releaseStock(request: ReleaseStockRequest): Promise<{ released: boolean }>;
  createPayment(request: CreatePaymentRequest): Promise<PaymentSummary>;
  voidPayment(request: { orderId: string; reason: string }): Promise<{ voided: boolean }>;
}

export const CHECKOUT_PARTICIPANTS = Symbol('CHECKOUT_PARTICIPANTS');

/** Orchestrator -> participant calls over TCP (ADR 0008). */
@Injectable()
export class RpcCheckoutParticipants implements CheckoutParticipants {
  constructor(private readonly services: ServiceRegistry) {}

  snapshot(variantIds: string[], p: string | null) {
    return this.services
      .get('catalog')
      .send<CheckoutSnapshotResponse>(RPC_PATTERNS.catalog.checkoutSnapshot, {
        variantIds,
        ...(p ? { p } : {}),
      });
  }

  quoteShipping(request: ShippingQuoteRequest) {
    return this.services.get('shipping').send<ShippingQuote>(RPC_PATTERNS.shipping.quote, request);
  }

  paymentInstructions() {
    return this.services
      .get('payment')
      .send<PaymentInstructions>(RPC_PATTERNS.payment.instructions, {});
  }

  reserveStock(request: ReserveStockRequest) {
    return this.services
      .get('inventory')
      .send<ReservationView>(RPC_PATTERNS.inventory.reserve, request);
  }

  releaseStock(request: ReleaseStockRequest) {
    return this.services
      .get('inventory')
      .send<{ released: boolean }>(RPC_PATTERNS.inventory.release, request);
  }

  createPayment(request: CreatePaymentRequest) {
    return this.services.get('payment').send<PaymentSummary>(RPC_PATTERNS.payment.create, request);
  }

  voidPayment(request: { orderId: string; reason: string }) {
    return this.services
      .get('payment')
      .send<{ voided: boolean }>(RPC_PATTERNS.payment.void, request);
  }
}
