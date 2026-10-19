import { AppError } from '@zelqune/common';
import { type Actor, type PaymentMethod, type QuoteStatus } from '@zelqune/contracts';

const TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  NEW: ['QUOTED', 'REJECTED', 'EXPIRED'],
  // re-pricing a quoted quote keeps it QUOTED
  QUOTED: ['QUOTED', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
  ACCEPTED: ['REJECTED', 'EXPIRED'],
  REJECTED: [],
  EXPIRED: [],
};

/** NEW -> QUOTED -> ACCEPTED (-> converted to an order); REJECTED / EXPIRED are final. */
export function canTransitionQuote(from: QuoteStatus, to: QuoteStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertQuoteTransition(from: QuoteStatus, to: QuoteStatus): void {
  if (!canTransitionQuote(from, to)) {
    throw new AppError('INVALID_QUOTE_TRANSITION', `Quote is ${from}, cannot become ${to}`, 409);
  }
}

/** Percentage below retail, rounded to 2 decimals (negative = above retail). */
export function discountPercent(retailPaisa: number, unitPaisa: number): number {
  if (retailPaisa <= 0) return 0;
  return Math.round(((retailPaisa - unitPaisa) / retailPaisa) * 10_000) / 100;
}

export interface PricedLineCheck {
  lineId: string;
  sku: string;
  retailPricePaisa: number | null;
  unitPricePaisa: number;
}

/**
 * Prices more than `maxDiscountPercent` below RETAIL need OWNER + allowDeepDiscount (5ক:
 * ~20% keeps a margin without ad spend; deeper only for large orders).
 */
export function assertDiscountsAllowed(
  lines: PricedLineCheck[],
  maxDiscountPercent: number,
  actor: Actor,
  allowDeepDiscount: boolean,
): void {
  const deep = lines
    .filter((l) => l.retailPricePaisa !== null)
    .map((l) => ({
      ...l,
      discountPercent: discountPercent(l.retailPricePaisa as number, l.unitPricePaisa),
    }))
    .filter((l) => l.discountPercent > maxDiscountPercent);
  if (deep.length === 0) return;
  if (actor.role === 'OWNER' && allowDeepDiscount) return;
  throw new AppError(
    'DISCOUNT_TOO_DEEP',
    actor.role === 'OWNER'
      ? `Discount above ${maxDiscountPercent}% needs allowDeepDiscount`
      : `Discount above ${maxDiscountPercent}% needs the owner`,
    422,
    {
      maxDiscountPercent,
      lines: deep.map(({ lineId, sku, discountPercent: d }) => ({
        lineId,
        sku,
        discountPercent: d,
      })),
    },
  );
}

/** How a converted quote is paid. advance = 0 means COD for the whole order (OWNER only). */
export function conversionPayment(
  method: PaymentMethod,
  advancePaisa: number,
  totalPaisa: number,
  actor: Actor,
): { kind: 'ADVANCE' | 'COD'; amountPaisa: number } {
  if (advancePaisa === 0) {
    if (method !== 'COD') {
      throw new AppError(
        'INVALID_PAYMENT_METHOD',
        'A quote without advance is converted as COD',
        422,
      );
    }
    if (actor.role !== 'OWNER') {
      throw new AppError(
        'COD_CONVERSION_OWNER_ONLY',
        'Only the owner can convert a quote without advance (COD)',
        422,
      );
    }
    return { kind: 'COD', amountPaisa: totalPaisa };
  }
  if (method === 'COD') {
    throw new AppError('ADVANCE_REQUIRED', 'This quote needs its advance via bKash or Nagad', 422);
  }
  return { kind: 'ADVANCE', amountPaisa: advancePaisa };
}
