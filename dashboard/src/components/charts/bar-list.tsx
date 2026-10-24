import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface BarRow {
  key: string;
  label: React.ReactNode;
  value: number;
  /** Shown under the label (e.g. "12 orders"). */
  sub?: React.ReactNode;
  href?: string;
}

/**
 * Ranked horizontal bars, one series, direct labels (name left, value right), so no legend is
 * needed. The bar sits behind the row; hover darkens it.
 */
export function BarList({
  rows,
  format,
  empty = 'Nothing in this period yet',
  limit,
}: {
  rows: BarRow[];
  format: (v: number) => string;
  empty?: string;
  limit?: number;
}) {
  const shown = limit ? rows.slice(0, limit) : rows;
  if (!shown.length) return <p className="py-8 text-center text-sm text-stone">{empty}</p>;
  const max = Math.max(...shown.map((r) => r.value), 1);
  return (
    <ul className="space-y-1.5">
      {shown.map((r) => {
        const inner = (
          <>
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 rounded-md bg-chart-revenue/14 transition-colors group-hover:bg-chart-revenue/22"
              style={{ width: `${Math.max((r.value / max) * 100, r.value ? 1.5 : 0)}%` }}
            />
            <span className="relative min-w-0">
              <span className="block truncate text-[0.8125rem] text-ink">{r.label}</span>
              {r.sub ? <span className="block text-xs text-stone">{r.sub}</span> : null}
            </span>
            <span className="relative shrink-0 text-[0.8125rem] font-medium text-ink tabular">
              {format(r.value)}
            </span>
          </>
        );
        const cls = cn(
          'group relative flex items-center justify-between gap-4 overflow-hidden rounded-md px-2.5',
          r.sub ? 'py-1.5' : 'py-2',
        );
        return (
          <li key={r.key}>
            {r.href ? (
              <Link href={r.href} className={cn(cls, 'hover:text-ink')}>
                {inner}
              </Link>
            ) : (
              <div className={cls}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
