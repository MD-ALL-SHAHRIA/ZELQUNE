import { SHIPMENT_STATUSES } from '@zelqune/contracts';
import { allowedShipmentTransitions, canTransitionShipment } from './shipment-state';

describe('shipment state machine', () => {
  it.each([
    ['PENDING', 'BOOKED'],
    ['PENDING', 'CANCELLED'],
    ['BOOKED', 'PICKED_UP'],
    ['BOOKED', 'CANCELLED'],
    ['PICKED_UP', 'IN_TRANSIT'],
    ['PICKED_UP', 'RETURNED'],
    ['IN_TRANSIT', 'DELIVERED'],
    ['IN_TRANSIT', 'RETURNED'],
  ] as const)('allows %s -> %s', (from, to) => expect(canTransitionShipment(from, to)).toBe(true));

  it('allows nothing else (exhaustive)', () => {
    const allowed = new Set([
      'PENDING>BOOKED',
      'PENDING>CANCELLED',
      'BOOKED>PICKED_UP',
      'BOOKED>CANCELLED',
      'PICKED_UP>IN_TRANSIT',
      'PICKED_UP>RETURNED',
      'IN_TRANSIT>DELIVERED',
      'IN_TRANSIT>RETURNED',
    ]);
    for (const from of SHIPMENT_STATUSES) {
      for (const to of SHIPMENT_STATUSES) {
        expect(canTransitionShipment(from, to)).toBe(allowed.has(`${from}>${to}`));
      }
    }
    expect(allowedShipmentTransitions('DELIVERED')).toEqual([]);
  });
});
