import { AppError } from '@zelqune/common';
import {
  MANUAL_METHODS,
  type PaymentInstructions,
  type PaymentKind,
  type PaymentMethod,
  type SaleMode,
} from '@zelqune/contracts';

export type AdvancePolicy =
  { mode: 'fixed'; fixedPaisa: number } | { mode: 'percent'; percent: number };

export interface Totals {
  subtotalPaisa: number;
  discountPaisa: number;
  shippingFeePaisa: number;
  totalPaisa: number;
  advanceRequiredPaisa: number;
}

/** Sale modes that are built after ordering and therefore need an advance. */
export const ADVANCE_SALE_MODES: readonly SaleMode[] = ['PRE_ORDER', 'MADE_TO_ORDER'];

/**
 * - IN_STOCK: no advance.
 * - PRE_ORDER / MADE_TO_ORDER: fixed amount per order (default ৳300), capped at the order
 *   total; or (percent mode) a share of the product subtotal rounded up to a whole taka.
 */
export function computeTotals(input: {
  lines: { unitPricePaisa: number; qty: number }[];
  shippingFeePaisa: number;
  saleMode: SaleMode;
  advance: AdvancePolicy;
}): Totals {
  const subtotalPaisa = input.lines.reduce((sum, l) => sum + l.unitPricePaisa * l.qty, 0);
  const discountPaisa = 0; // coupons arrive in M2
  const totalPaisa = subtotalPaisa - discountPaisa + input.shippingFeePaisa;
  let advance = 0;
  if (ADVANCE_SALE_MODES.includes(input.saleMode)) {
    advance =
      input.advance.mode === 'fixed'
        ? input.advance.fixedPaisa
        : Math.ceil((subtotalPaisa * input.advance.percent) / 100 / 100) * 100;
  }
  return {
    subtotalPaisa,
    discountPaisa,
    shippingFeePaisa: input.shippingFeePaisa,
    totalPaisa,
    advanceRequiredPaisa: Math.min(advance, totalPaisa),
  };
}

/** Manual methods are only offered when a receiving number is configured. */
export function allowedPaymentMethods(
  saleMode: SaleMode,
  instructions: PaymentInstructions,
): PaymentMethod[] {
  const manual = MANUAL_METHODS.filter((m) =>
    m === 'BKASH_MANUAL' ? instructions.bkash : instructions.nagad,
  );
  return ADVANCE_SALE_MODES.includes(saleMode) ? [...manual] : ['COD', ...manual];
}

/** What gets charged now, and as what. Throws for combinations the shop does not accept. */
export function paymentPlan(
  saleMode: SaleMode,
  method: PaymentMethod,
  totals: Totals,
  allowed: PaymentMethod[],
): { kind: PaymentKind; amountPaisa: number } {
  if (method === 'COD' && ADVANCE_SALE_MODES.includes(saleMode)) {
    throw new AppError(
      'ADVANCE_REQUIRED',
      'Pre-orders and made-to-order items need an advance via bKash or Nagad',
      422,
    );
  }
  if (!allowed.includes(method)) {
    throw new AppError(
      'PAYMENT_METHOD_UNAVAILABLE',
      `${method} is not available for this order`,
      422,
    );
  }
  if (method === 'COD') return { kind: 'COD', amountPaisa: totals.totalPaisa };
  if (ADVANCE_SALE_MODES.includes(saleMode))
    return { kind: 'ADVANCE', amountPaisa: totals.advanceRequiredPaisa };
  return { kind: 'FULL', amountPaisa: totals.totalPaisa };
}
