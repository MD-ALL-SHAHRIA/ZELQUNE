'use client';

import { cn } from '@/lib/cn';

/**
 * Horizontal bars with direct labels (funnel steps, one series): each row names its step and
 * value, so no legend is needed. Hover shows the step-to-step rate.
 */
export function FunnelBars({ steps }: { steps: { label: string; value: number }[] }) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const prev = i > 0 ? steps[i - 1]!.value : null;
        const rate = prev
          ? `${((s.value / prev) * 100).toFixed(0)}% of ${steps[i - 1]!.label.toLowerCase()}`
          : 'All sessions';
        return (
          <li key={s.label} title={rate} className="group">
            <div className="mb-1 flex items-baseline justify-between text-[0.8125rem]">
              <span className="text-ink/85">{s.label}</span>
              <span className="font-medium text-ink tabular">
                {s.value.toLocaleString('en')}
                {prev ? (
                  <span className="ml-2 text-xs font-normal text-stone">
                    {((s.value / prev) * 100).toFixed(0)}%
                  </span>
                ) : null}
              </span>
            </div>
            <div className="h-2 rounded-full bg-sand">
              <div
                className="h-full rounded-full bg-chart-revenue transition-[width] duration-700 group-hover:brightness-110"
                style={{ width: `${Math.max((s.value / max) * 100, s.value ? 2 : 0)}%` }}
              />
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
