const taka = new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 });

/** Money is integer paisa everywhere; shown as ৳ with thousands separators. */
export function formatTaka(paisa: number): string {
  return `৳${taka.format(Math.round(paisa / 100))}`;
}

const dateTime = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Asia/Dhaka',
});
export function formatDateTime(iso: string): string {
  return dateTime.format(new Date(iso));
}

/** "PENDING_PAYMENT" -> "Pending payment". */
export function humanize(value: string): string {
  const s = value.toLowerCase().replaceAll('_', ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
