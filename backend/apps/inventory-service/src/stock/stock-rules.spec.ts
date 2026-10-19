import { canTransitionReservation, findShortages, mergeLines } from './stock-rules';

const A = 'aaaaaaaa-0000-4000-8000-000000000000';
const B = 'bbbbbbbb-0000-4000-8000-000000000000';

describe('stock rules', () => {
  it('merges duplicate lines and orders by variant id', () => {
    expect(
      mergeLines([
        { variantId: B, qty: 1 },
        { variantId: A, qty: 2 },
        { variantId: B, qty: 3 },
      ]),
    ).toEqual([
      { variantId: A, qty: 2 },
      { variantId: B, qty: 4 },
    ]);
  });

  it('finds shortages using available = onHand - reserved', () => {
    const rows = [{ variantId: A, onHand: 5, reserved: 4 }];
    expect(findShortages(rows, [{ variantId: A, qty: 1 }])).toEqual([]);
    expect(findShortages(rows, [{ variantId: A, qty: 2 }])).toEqual([
      { variantId: A, requested: 2, available: 1 },
    ]);
    expect(findShortages(rows, [{ variantId: B, qty: 1 }])).toEqual([
      { variantId: B, requested: 1, available: 0 },
    ]);
  });

  it.each([
    ['PENDING', 'HELD', true],
    ['PENDING', 'COMMITTED', true],
    ['PENDING', 'RELEASED', true],
    ['HELD', 'COMMITTED', true],
    ['HELD', 'RELEASED', true],
    ['HELD', 'PENDING', false],
    ['COMMITTED', 'RELEASED', false],
    ['RELEASED', 'HELD', false],
    ['RELEASED', 'COMMITTED', false],
  ] as const)('reservation %s -> %s allowed=%s', (from, to, allowed) => {
    expect(canTransitionReservation(from, to)).toBe(allowed);
  });
});
