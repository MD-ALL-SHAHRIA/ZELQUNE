import { type ShipmentStatus } from '@zelqune/contracts';

const TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  PENDING: ['BOOKED', 'CANCELLED'],
  BOOKED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['IN_TRANSIT', 'RETURNED'],
  IN_TRANSIT: ['DELIVERED', 'RETURNED'],
  DELIVERED: [],
  RETURNED: [],
  CANCELLED: [],
};

/** The only way a shipment's status changes. */
export function canTransitionShipment(from: ShipmentStatus, to: ShipmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function allowedShipmentTransitions(from: ShipmentStatus): readonly ShipmentStatus[] {
  return TRANSITIONS[from];
}
