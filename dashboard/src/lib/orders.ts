import { type Tone } from '@/components/ui/badge';
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

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Payment check',
  CONFIRMED: 'Confirmed',
  IN_PRODUCTION: 'In production',
  READY_TO_SHIP: 'Ready to ship',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURN_REQUESTED: 'Return requested',
  RETURNED: 'Returned',
  REFUNDED: 'Refunded',
};

export function statusTone(status: OrderStatus): Tone {
  switch (status) {
    case 'PENDING_PAYMENT':
    case 'RETURN_REQUESTED':
      return 'warning';
    case 'CONFIRMED':
    case 'IN_PRODUCTION':
    case 'READY_TO_SHIP':
      return 'info';
    case 'SHIPPED':
      return 'accent';
    case 'DELIVERED':
      return 'success';
    case 'CANCELLED':
    case 'RETURNED':
      return 'danger';
    default:
      return 'neutral';
  }
}

/** The order pipeline shown on Home and as Orders tabs, in working order. */
export const PIPELINE: OrderStatus[] = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY_TO_SHIP',
  'SHIPPED',
];
