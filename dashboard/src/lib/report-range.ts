import { dhakaDate } from './dates';

export type Preset = '7d' | '30d' | '90d' | 'month' | 'lastMonth' | 'year' | 'custom';

export const PRESET_LABEL: Record<Preset, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  month: 'This month',
  lastMonth: 'Last month',
  year: 'This year',
  custom: 'Custom',
};

const DAY = 86_400_000;

/** A preset as BD calendar days (from..to inclusive). */
export function presetRange(preset: Exclude<Preset, 'custom'>, now = new Date()) {
  const today = dhakaDate(now);
  const back = (days: number) => dhakaDate(new Date(now.getTime() - (days - 1) * DAY));
  const [y, m] = today.split('-').map(Number) as [number, number];
  const first = (yy: number, mm: number) => `${yy}-${String(mm).padStart(2, '0')}-01`;
  switch (preset) {
    case '7d':
      return { from: back(7), to: today };
    case '30d':
      return { from: back(30), to: today };
    case '90d':
      return { from: back(90), to: today };
    case 'month':
      return { from: first(y, m), to: today };
    case 'lastMonth': {
      const [py, pm] = m === 1 ? [y - 1, 12] : [y, m - 1];
      const last = new Date(Date.UTC(y, m - 1, 0)).toISOString().slice(0, 10);
      return { from: first(py, pm), to: last };
    }
    case 'year':
      return { from: `${y}-01-01`, to: today };
  }
}

/** The same number of days right before the range. */
export function previousOf(range: { from: string; to: string }) {
  const days = (Date.parse(range.to) - Date.parse(range.from)) / DAY + 1;
  const to = new Date(Date.parse(`${range.from}T00:00:00Z`) - DAY);
  const from = new Date(to.getTime() - (days - 1) * DAY);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

const fmt = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
export const rangeLabel = (r: { from: string; to: string }) =>
  `${fmt.format(new Date(`${r.from}T00:00:00Z`))} – ${fmt.format(new Date(`${r.to}T00:00:00Z`))}`;
