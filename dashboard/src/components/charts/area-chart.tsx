'use client';

import { useId, useState } from 'react';
import { useWidth } from './use-width';

export interface Point {
  label: string;
  value: number;
}

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
};

/**
 * One-series area chart (revenue over days): 2px line, a soft fill, recessive grid and axis,
 * and a crosshair + tooltip on hover/focus. Values are formatted by the caller.
 */
export function AreaChart({
  data,
  height = 240,
  format,
  label,
}: {
  data: Point[];
  height?: number;
  format: (v: number) => string;
  label: string;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const pad = { top: 12, right: 8, bottom: 26, left: 56 };
  const w = Math.max(width - pad.left - pad.right, 1);
  const h = height - pad.top - pad.bottom;
  const max = niceMax(Math.max(...data.map((d) => d.value), 0));
  const x = (i: number) => pad.left + (data.length > 1 ? (i / (data.length - 1)) * w : w / 2);
  const y = (v: number) => pad.top + h - (v / max) * h;
  const line = data
    .map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`)
    .join('');
  const area = data.length
    ? `${line}L${x(data.length - 1)},${pad.top + h}L${x(0)},${pad.top + h}Z`
    : '';
  const ticks = [0, 0.5, 1].map((t) => t * max);
  const every = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(w / 72))));
  const active = hover !== null ? data[hover] : null;
  const empty = data.every((d) => d.value === 0);

  if (empty) {
    return (
      <div
        className="grid w-full place-items-center rounded-lg border border-dashed border-line text-center"
        style={{ height }}
      >
        <div>
          <p className="text-sm font-medium text-ink">No revenue in this period yet</p>
          <p className="mt-1 text-[0.8125rem] text-stone">
            Confirmed orders will draw the line here.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 ? (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={label}
          className="overflow-visible"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const i = Math.round(((e.clientX - r.left - pad.left) / w) * (data.length - 1));
            setHover(Math.min(Math.max(i, 0), data.length - 1));
          }}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-chart-revenue)" stopOpacity="0.22" />
              <stop offset="100%" stopColor="var(--color-chart-revenue)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={pad.left}
                x2={pad.left + w}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--color-line)"
                strokeDasharray={t ? '3 4' : undefined}
              />
              <text
                x={pad.left - 10}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-stone text-[11px] tabular"
              >
                {format(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) =>
            i % every === 0 || i === data.length - 1 ? (
              <text
                key={d.label + i}
                x={x(i)}
                y={height - 6}
                textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'}
                className="fill-stone text-[11px]"
              >
                {d.label}
              </text>
            ) : null,
          )}
          <path d={area} fill={`url(#${id}-fill)`} />
          <path
            d={line}
            fill="none"
            stroke="var(--color-chart-revenue)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {hover !== null && active ? (
            <g>
              <line
                x1={x(hover)}
                x2={x(hover)}
                y1={pad.top}
                y2={pad.top + h}
                stroke="var(--color-ink)"
                strokeOpacity="0.25"
              />
              <circle
                cx={x(hover)}
                cy={y(active.value)}
                r="5"
                fill="var(--color-chart-revenue)"
                stroke="var(--color-surface)"
                strokeWidth="2"
              />
            </g>
          ) : null}
        </svg>
      ) : null}
      {hover !== null && active ? (
        <div
          role="tooltip"
          className="pointer-events-none absolute top-1 z-10 -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[var(--shadow-pop)]"
          style={{ left: Math.min(Math.max(x(hover), 70), width - 70) }}
        >
          <p className="text-stone">{active.label}</p>
          <p className="mt-0.5 text-sm font-semibold text-ink tabular">{format(active.value)}</p>
        </div>
      ) : null}
    </div>
  );
}
