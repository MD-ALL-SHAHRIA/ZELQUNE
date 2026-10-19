import { type OrderStatus } from '@zelqune/contracts';

/** Bangladesh has no DST: calendar days are UTC+6. */
export const BD_TZ = 'Asia/Dhaka';
const BD_OFFSET_MS = 6 * 3_600_000;
const DEFAULT_RANGE_DAYS = 30;

/**
 * Orders that count toward GO when they also are B2C, not a friend, and have a VERIFIED
 * advance (> 0). Confirmed-then-cancelled/returned/refunded orders do not count.
 */
export const GO_STATUSES: readonly OrderStatus[] = [
  'CONFIRMED',
  'IN_PRODUCTION',
  'READY_TO_SHIP',
  'SHIPPED',
  'DELIVERED',
  'RETURN_REQUESTED',
];

/** Statuses whose revenue counts (paid orders that were not undone). */
export const REVENUE_STATUSES = GO_STATUSES;

export function bdToday(now = new Date()): string {
  return new Date(now.getTime() + BD_OFFSET_MS).toISOString().slice(0, 10);
}

/** [start, end) instants for BD calendar days `from`..`to` inclusive. */
export function bdRange(from: string, to: string): { start: Date; end: Date } {
  const start = new Date(`${from}T00:00:00+06:00`);
  const end = new Date(new Date(`${to}T00:00:00+06:00`).getTime() + 86_400_000);
  return { start, end };
}

/** Defaults to the last 30 BD days; validates order and caps at 366 days. */
export function resolveRange(
  query: { from?: string; to?: string },
  now = new Date(),
): { from: string; to: string } {
  const to = query.to ?? bdToday(now);
  const from =
    query.from ??
    new Date(new Date(`${to}T00:00:00Z`).getTime() - (DEFAULT_RANGE_DAYS - 1) * 86_400_000)
      .toISOString()
      .slice(0, 10);
  if (from > to)
    throw Object.assign(new Error('from must be on or before to'), { code: 'INVALID_RANGE' });
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000 + 1;
  if (days > 366)
    throw Object.assign(new Error('range is limited to 366 days'), { code: 'INVALID_RANGE' });
  return { from, to };
}

export function conversionRate(purchases: number, sessions: number): number {
  return sessions === 0 ? 0 : Math.round((purchases / sessions) * 10_000) / 10_000;
}
