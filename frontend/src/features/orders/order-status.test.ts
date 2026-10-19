import { describe, expect, it } from 'vitest';
import { type OrderTracking } from './api-types';
import { displayStatus } from './order-status';

const order = (status: OrderTracking['status'], payment: string | null) =>
  ({ status, payment: payment ? { status: payment } : null }) as unknown as OrderTracking;

describe('displayStatus', () => {
  it('shows "checking payment" while a submitted advance awaits verification', () => {
    expect(displayStatus(order('PENDING_PAYMENT', 'SUBMITTED'))).toBe('PAYMENT_SUBMITTED');
    expect(displayStatus(order('PENDING_PAYMENT', null))).toBe('PENDING_PAYMENT');
    expect(displayStatus(order('CONFIRMED', 'VERIFIED'))).toBe('CONFIRMED');
  });
});
