const taka = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Money is integer paisa everywhere; shown as ৳ with Bangladeshi grouping (lakh). */
export function formatTaka(paisa: number): string {
  return `৳${taka.format(Math.round(paisa / 100))}`;
}
/** Compact axis labels: ৳12k, ৳1.2L. */
export function formatTakaShort(paisa: number): string {
  if (paisa < 0) return `−${formatTakaShort(-paisa)}`;
  const t = paisa / 100;
  if (t >= 100_000) return `৳${(t / 100_000).toFixed(t >= 1_000_000 ? 0 : 1)}L`;
  if (t >= 1000) return `৳${(t / 1000).toFixed(t >= 10_000 ? 0 : 1)}k`;
  return `৳${Math.round(t)}`;
}

const dateTime = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Dhaka',
});
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

const rel = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
/** "5 minutes ago", "yesterday"… (falls back to the date after a week). */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.round((new Date(iso).getTime() - now) / 1000);
  const a = Math.abs(s);
  if (a < 60) return rel.format(Math.round(s), 'second');
  if (a < 3600) return rel.format(Math.round(s / 60), 'minute');
  if (a < 86_400) return rel.format(Math.round(s / 3600), 'hour');
  if (a < 604_800) return rel.format(Math.round(s / 86_400), 'day');
  return formatDateTime(iso);
}

/** "PENDING_PAYMENT" -> "Pending payment". */
export function humanize(value: string): string {
  const s = value.toLowerCase().replaceAll('_', ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Percentage change, or null when there is nothing to compare with. */
export function delta(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}
