/** YYYY-MM-DD in Dhaka time (the business day). */
export function dhakaDate(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }).format(d);
}

export type Range = '1' | '7' | '30';

/** The last `days` days (today included), and the same length just before it. */
export function ranges(days: number, now = new Date()) {
  const day = 86_400_000;
  const to = new Date(now);
  const from = new Date(now.getTime() - (days - 1) * day);
  const prevTo = new Date(from.getTime() - day);
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * day);
  return {
    current: { from: dhakaDate(from), to: dhakaDate(to) },
    previous: { from: dhakaDate(prevFrom), to: dhakaDate(prevTo) },
  };
}

const short = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export function shortDay(iso: string): string {
  return short.format(new Date(`${iso}T00:00:00Z`));
}

/** ISO instant -> "YYYY-MM-DDTHH:mm" in Dhaka time, for <input type="datetime-local">. */
export function toDhakaInput(iso: string): string {
  return new Date(new Date(iso).getTime() + 6 * 3_600_000).toISOString().slice(0, 16);
}
/** "YYYY-MM-DDTHH:mm" read as Dhaka time -> ISO instant. */
export function fromDhakaInput(value: string): string {
  return new Date(`${value}:00+06:00`).toISOString();
}

const when = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Dhaka',
});
export const formatWhen = (iso: string) => when.format(new Date(iso));

/** "2d 4h left", "3h 12m left", "starts in 5d". */
export function countdown(toIso: string, now = Date.now()): string {
  let s = Math.max(0, Math.floor((new Date(toIso).getTime() - now) / 1000));
  const d = Math.floor(s / 86_400);
  s -= d * 86_400;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s - h * 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
}
