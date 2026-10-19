import { type OrderStatus, type SaleMode } from '@zelqune/contracts';

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
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

/**
 * The only way an order's status changes. IN_PRODUCTION exists only for made-to-order and
 * pre-order items.
 */
export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus,
  saleMode: SaleMode,
): boolean {
  if (to === 'IN_PRODUCTION' && saleMode === 'IN_STOCK') return false;
  return TRANSITIONS[from].includes(to);
}
