'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

export interface Slice {
  key: string;
  label: string;
  value: number;
  /** A chart colour class pair, e.g. 'stroke-chart-a' + 'bg-chart-a'. */
  color: { stroke: string; fill: string };
}

/**
 * Share of a whole for 2–4 categories (validated categorical colours, a 2px surface gap between
 * arcs). The legend names every slice with its value and share, so identity never rests on
 * colour; hovering a slice or its legend row highlights both.
 */
export function Donut({
  slices,
  format,
  centerLabel,
  size = 168,
}: {
  slices: Slice[];
  format: (v: number) => string;
  centerLabel: string;
  size?: number;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const stroke = 22;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const gap = total > 0 && slices.filter((s) => s.value > 0).length > 1 ? 2 : 0;
  let offset = 0;
  const focused = slices.find((s) => s.key === hover);

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            className="stroke-sand"
          />
          {total > 0
            ? slices.map((s) => {
                const len = (s.value / total) * c;
                const dash = Math.max(len - gap, 0);
                const el = (
                  <circle
                    key={s.key}
                    cx={size / 2}
                    cy={size / 2}
                    r={r}
                    fill="none"
                    strokeWidth={hover === s.key ? stroke + 4 : stroke}
                    strokeDasharray={`${dash} ${c - dash}`}
                    strokeDashoffset={-offset}
                    className={cn(s.color.stroke, 'transition-[stroke-width,opacity] duration-200')}
                    opacity={hover && hover !== s.key ? 0.4 : 1}
                    onMouseEnter={() => setHover(s.key)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <title>{`${s.label}: ${format(s.value)}`}</title>
                  </circle>
                );
                offset += len;
                return el;
              })
            : null}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-[0.6875rem] font-medium text-stone">
              {focused ? focused.label : centerLabel}
            </p>
            <p className="mt-0.5 text-lg font-semibold tracking-[-0.02em] text-ink tabular">
              {format(focused ? focused.value : total)}
            </p>
          </div>
        </div>
      </div>
      <ul className="min-w-40 flex-1 space-y-2.5">
        {slices.map((s) => (
          <li
            key={s.key}
            onMouseEnter={() => setHover(s.key)}
            onMouseLeave={() => setHover(null)}
            className={cn(
              'flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-[0.8125rem] transition-colors',
              hover === s.key && 'bg-ink/5',
            )}
          >
            <span className="flex items-center gap-2 text-ink/85">
              <span className={cn('size-2.5 rounded-full', s.color.fill)} aria-hidden />
              {s.label}
            </span>
            <span className="text-right tabular">
              <span className="font-medium text-ink">{format(s.value)}</span>
              <span className="ml-2 text-xs text-stone">
                {total ? Math.round((s.value / total) * 100) : 0}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
