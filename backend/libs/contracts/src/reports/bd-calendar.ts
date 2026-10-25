/** Bangladesh has no DST: calendar days are UTC+6. Shared by the report builders. */
const BD_OFFSET_MS = 6 * 3_600_000;
const DAY_MS = 86_400_000;

export const bdDayOf = (at: Date): string =>
  new Date(at.getTime() + BD_OFFSET_MS).toISOString().slice(0, 10);
export const bdMonthOf = (at: Date): string => bdDayOf(at).slice(0, 7);

/** [start, end) instants for BD calendar days `from`..`to` inclusive. */
export function bdDayBounds(from: string, to: string): { start: Date; end: Date } {
  const start = new Date(`${from}T00:00:00+06:00`);
  const end = new Date(new Date(`${to}T00:00:00+06:00`).getTime() + DAY_MS);
  return { start, end };
}

/** Defaults to the last 30 BD days; `from` <= `to`, at most 366 days. Null when invalid. */
export function resolveReportRange(
  query: { from?: string; to?: string },
  now = new Date(),
): { from: string; to: string } | null {
  const to = query.to ?? bdDayOf(now);
  const from =
    query.from ?? new Date(Date.parse(`${to}T00:00:00Z`) - 29 * DAY_MS).toISOString().slice(0, 10);
  const days = (Date.parse(to) - Date.parse(from)) / DAY_MS + 1;
  return from <= to && days <= 366 ? { from, to } : null;
}

/** The period of equal length right before `from`..`to`. */
export function previousRange(range: { from: string; to: string }): { from: string; to: string } {
  const days = (Date.parse(range.to) - Date.parse(range.from)) / DAY_MS + 1;
  const to = new Date(Date.parse(`${range.from}T00:00:00Z`) - DAY_MS);
  const from = new Date(to.getTime() - (days - 1) * DAY_MS);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** Every BD day from..to inclusive (for zero-filled series). */
export function bdDays(from: string, to: string): string[] {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += DAY_MS)
    out.push(new Date(t).toISOString().slice(0, 10));
  return out;
}

/** Every month (YYYY-MM) touched by from..to. */
export function bdMonths(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.slice(0, 7).split('-').map(Number) as [number, number];
  const last = to.slice(0, 7);
  for (;;) {
    const key = `${y}-${String(m).padStart(2, '0')}`;
    out.push(key);
    if (key >= last) return out;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
}
