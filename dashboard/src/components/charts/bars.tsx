'use client';

import { cn } from '@/lib/cn';

const SEGMENTS = 20;

/**
 * Funnel as pill segments (Northstar pattern): each step names itself on the left over a quiet
 * hatch, and fills N of 20 pills in the accent with its count and share on the right. The share
 * is written out, so the bar is never the only carrier of the number.
 */
export function FunnelBars({
  steps,
  compact = false,
}: {
  steps: { label: string; value: number }[];
  compact?: boolean;
}) {
  const first = steps[0]?.value ?? 0;
  return (
    <ol className={cn('space-y-5', compact && 'space-y-4')}>
      {steps.map((s) => {
        const share = first ? s.value / first : 0;
        const filled = s.value > 0 ? Math.max(1, Math.round(share * SEGMENTS)) : 0;
        return (
          <li
            key={s.label}
            className="grid grid-cols-[minmax(7rem,9rem)_1fr] items-end gap-x-5 gap-y-1.5"
          >
            <div className="min-w-0 self-stretch">
              {compact ? null : <div aria-hidden className="bg-hatch mb-2 h-6 rounded-sm" />}
              <p className="truncate text-sm text-ink">{s.label}</p>
            </div>
            <div className="min-w-0">
              <p className="mb-1.5 text-right font-mono text-[0.8125rem] text-ink tabular">
                {s.value.toLocaleString('en')}
                <span className="ml-2 text-stone">{Math.round(share * 100)}%</span>
              </p>
              <div
                className="flex gap-[3px]"
                role="img"
                aria-label={`${s.label}: ${s.value}, ${Math.round(share * 100)}%`}
              >
                {Array.from({ length: SEGMENTS }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-9 min-w-0 flex-1 rounded-full transition-colors duration-500',
                      i < filled
                        ? 'bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-accent)_78%,white),var(--color-accent))] shadow-[inset_0_-1px_0_rgba(0,0,0,0.12)]'
                        : 'bg-sand',
                    )}
                  />
                ))}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Two arms side by side (A/B price test): legend + direct labels, blue/orange (validated). */
export function CompareBars({
  rows,
  format,
}: {
  rows: { label: string; a: number; b: number }[];
  format: (v: number) => string;
}) {
  const max = Math.max(...rows.flatMap((r) => [r.a, r.b]), 1);
  return (
    <div>
      <div className="mb-3 flex gap-4 text-xs text-stone">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-a" aria-hidden /> Price A
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-chart-b" aria-hidden /> Price B
        </span>
      </div>
      <dl className="space-y-3.5">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="mb-1 text-[0.8125rem] text-ink/85">{r.label}</dt>
            {(['a', 'b'] as const).map((k) => (
              <dd
                key={k}
                className="mb-0.5 flex items-center gap-2"
                title={`Price ${k.toUpperCase()}: ${format(r[k])}`}
              >
                <span className="w-3 text-[0.6875rem] text-stone uppercase">{k}</span>
                <span className="h-2 flex-1 rounded-full bg-sand">
                  <span
                    className={cn(
                      'block h-full rounded-full',
                      k === 'a' ? 'bg-chart-a' : 'bg-chart-b',
                    )}
                    style={{ width: `${Math.max((r[k] / max) * 100, r[k] ? 2 : 0)}%` }}
                  />
                </span>
                <span className="w-14 text-right text-xs text-ink tabular">{format(r[k])}</span>
              </dd>
            ))}
          </div>
        ))}
      </dl>
    </div>
  );
}
