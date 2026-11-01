import { type PrivacyRequestStatus, type PrivacyRequestType } from '@zelqune/contracts';

/** Who may move a request where (ADR 0020). Finished requests never change again. */
const TRANSITIONS: Record<PrivacyRequestStatus, readonly PrivacyRequestStatus[]> = {
  PENDING: ['VERIFICATION_REQUIRED', 'IN_PROGRESS', 'REJECTED'],
  VERIFICATION_REQUIRED: ['IN_PROGRESS', 'REJECTED'],
  IN_PROGRESS: ['COMPLETED', 'REJECTED'],
  COMPLETED: [],
  REJECTED: [],
};

export function canTransitionPrivacy(
  from: PrivacyRequestStatus,
  to: PrivacyRequestStatus,
): boolean {
  return TRANSITIONS[from].includes(to);
}

/** Which action fits which request type. Every action needs a verified (IN_PROGRESS) request. */
export const ACTION_TYPES = {
  export: ['ACCESS'],
  correct: ['CORRECTION'],
  erase: ['DELETION'],
  complete: ['ACCESS', 'CONSENT_WITHDRAWAL'],
} as const satisfies Record<string, readonly PrivacyRequestType[]>;

/**
 * What an erasure does with one order:
 * - ERASE: cancelled before any money moved, so nothing needs keeping;
 * - RETAIN: a sale happened (paid or delivered, returned, refunded): kept as an accounting record;
 * - BLOCK: still running; it must finish or be cancelled before the data can go.
 */
export type OrderFate = 'ERASE' | 'RETAIN' | 'BLOCK';
const ACTIVE = new Set([
  'PENDING_PAYMENT',
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY_TO_SHIP',
  'SHIPPED',
  'RETURN_REQUESTED',
]);

export function orderFate(order: { status: string; confirmedAt: Date | null }): OrderFate {
  if (ACTIVE.has(order.status)) return 'BLOCK';
  if (order.status === 'CANCELLED' && !order.confirmedAt) return 'ERASE';
  return 'RETAIN';
}

/** +8801712345678 -> +88017******78: enough to recognise, not enough to call. */
export function maskPhone(phone: string): string {
  if (phone.length < 8) return '***';
  return `${phone.slice(0, 6)}${'*'.repeat(phone.length - 8)}${phone.slice(-2)}`;
}

/** Stored in place of personal fields on erased records. */
export const ERASED = 'ERASED';
