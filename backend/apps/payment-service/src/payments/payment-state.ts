import { type PaymentStatus } from '@zelqune/contracts';

/**
 * Manual mobile: SUBMITTED -> VERIFIED | REJECTED | VOID
 * COD:           COD_PENDING -> COD_CONFIRMED -> COLLECTED (VOID before collection)
 */
const TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  SUBMITTED: ['VERIFIED', 'REJECTED', 'VOID'],
  VERIFIED: [],
  REJECTED: [],
  COD_PENDING: ['COD_CONFIRMED', 'VOID'],
  COD_CONFIRMED: ['COLLECTED', 'VOID'],
  COLLECTED: [],
  VOID: [],
};

/** The only way a payment's status changes. */
export function canTransitionPayment(from: PaymentStatus, to: PaymentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Payments that still count for the order (one open payment per order). */
export const OPEN_PAYMENT_STATUSES: readonly PaymentStatus[] = [
  'SUBMITTED',
  'COD_PENDING',
  'COD_CONFIRMED',
];
