import { type Schemas } from './api';

export type OrderStatus = Schemas['AdminOrderDetailDto_Output']['status'];

/** Mirrors order-service's state machine (domain/order-state.ts); the server has the final say. */
export const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PRODUCTION', 'READY_TO_SHIP', 'CANCELLED'],
  IN_PRODUCTION: ['READY_TO_SHIP', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'RETURNED'],
  DELIVERED: ['RETURN_REQUESTED'],
  RETURN_REQUESTED: ['RETURNED', 'DELIVERED'],
  RETURNED: ['REFUNDED'],
  CANCELLED: ['REFUNDED'],
  REFUNDED: [],
};

export function statusTone(status: OrderStatus): 'green' | 'amber' | 'red' | 'stone' {
  if (status === 'PENDING_PAYMENT') return 'amber';
  if (['CANCELLED', 'RETURNED', 'REFUNDED', 'RETURN_REQUESTED'].includes(status)) return 'red';
  if (status === 'DELIVERED') return 'green';
  return 'stone';
}
