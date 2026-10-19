import { type OrderTracking } from '@/shared/api/types';

export type DisplayStatus = OrderTracking['status'] | 'PAYMENT_SUBMITTED';

/**
 * The copy has a "Checking payment" label: an order still PENDING_PAYMENT whose advance has been
 * submitted (trxId sent, not yet verified) shows that instead of "Awaiting payment".
 */
export function displayStatus(order: Pick<OrderTracking, 'status' | 'payment'>): DisplayStatus {
  if (order.status === 'PENDING_PAYMENT' && order.payment?.status === 'SUBMITTED') {
    return 'PAYMENT_SUBMITTED';
  }
  return order.status;
}
