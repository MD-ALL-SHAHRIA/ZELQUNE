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
