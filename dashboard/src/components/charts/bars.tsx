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
