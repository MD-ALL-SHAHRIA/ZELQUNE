import { type ReservationStatus, type StockLine } from '@zelqune/contracts';

/** Sums quantities of duplicate variants and sorts by id (stable lock order, no deadlocks). */
export function mergeLines(lines: StockLine[]): StockLine[] {
  const totals = new Map<string, number>();
  for (const { variantId, qty } of lines) totals.set(variantId, (totals.get(variantId) ?? 0) + qty);
  return [...totals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([variantId, qty]) => ({ variantId, qty }));
}

export interface StockRow {
  variantId: string;
  onHand: number;
  reserved: number;
}

export interface Shortage {
  variantId: string;
  requested: number;
  available: number;
}

/** Lines that cannot be reserved; a variant without an inventory row has 0 available. */
export function findShortages(rows: StockRow[], lines: StockLine[]): Shortage[] {
  const byId = new Map(rows.map((r) => [r.variantId, r]));
  return lines.flatMap(({ variantId, qty }) => {
    const row = byId.get(variantId);
    const available = row ? row.onHand - row.reserved : 0;
    return available >= qty
      ? []
      : [{ variantId, requested: qty, available: Math.max(0, available) }];
  });
}

const TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ['HELD', 'COMMITTED', 'RELEASED'],
  HELD: ['COMMITTED', 'RELEASED'],
  COMMITTED: [],
  RELEASED: [],
};

/** Reservation lifecycle: PENDING -> HELD -> COMMITTED | RELEASED (terminal states are final). */
export function canTransitionReservation(from: ReservationStatus, to: ReservationStatus): boolean {
  return TRANSITIONS[from].includes(to);
}
