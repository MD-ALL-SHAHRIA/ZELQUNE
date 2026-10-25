'use client';

import { useState } from 'react';
import { useWidth } from './use-width';

/**
 * Columns per period for one signed measure (net profit by month): above zero in the series
 * colour, below zero in the loss colour and labelled "Loss" in the tooltip, so sign never rests
 * on colour alone. One axis, a zero line, hover tooltip per column.
 */
export function ColumnChart({
  data,
  format,
  label,
  height = 220,
}: {
  data: { label: string; value: number; detail?: string }[];
  format: (v: number) => string;
  label: string;
  height?: number;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const pad = { top: 14, right: 8, bottom: 26, left: 56 };
  const w = Math.max(width - pad.left - pad.right, 1);
  const h = height - pad.top - pad.bottom;
  const max = Math.max(...data.map((d) => d.value), 0);
  const min = Math.min(...data.map((d) => d.value), 0);
  const span = max - min || 1;
  const y = (v: number) => pad.top + ((max - v) / span) * h;
  const slot = w / Math.max(data.length, 1);
  const bar = Math.min(Math.max(slot * 0.55, 6), 44);
  const ticks = [max, (max + min) / 2, min].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div ref={ref} className="relative" role="img" aria-label={label}>
      {width > 0 ? (
        <svg width={width} height={height} className="block overflow-visible">
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={pad.left}
                x2={pad.left + w}
                y1={y(t)}
                y2={y(t)}
                className="stroke-line"
                strokeDasharray={t === 0 ? undefined : '2 4'}
              />
              <text
                x={pad.left - 8}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                className="fill-stone text-[0.6875rem] tabular"
              >
                {format(t)}
              </text>
            </g>
          ))}
          <line x1={pad.left} x2={pad.left + w} y1={y(0)} y2={y(0)} className="stroke-ink/30" />
          {data.map((d, i) => {
            const cx = pad.left + slot * i + slot / 2;
            const top = Math.min(y(d.value), y(0));
            const hgt = Math.max(Math.abs(y(d.value) - y(0)), d.value ? 2 : 0);
            return (
              <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <rect
                  x={pad.left + slot * i}
                  y={pad.top}
                  width={slot}
                  height={h}
                  fill="transparent"
                />
                <rect
                  x={cx - bar / 2}
                  y={top}
                  width={bar}
                  height={hgt}
                  rx={4}
                  className={d.value < 0 ? 'fill-danger/80' : 'fill-chart-revenue'}
                  opacity={hover === null || hover === i ? 1 : 0.55}
                />
                <text
                  x={cx}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-stone text-[0.6875rem]"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      ) : (
        <div style={{ height }} />
      )}
      {hover !== null && data[hover] ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-[var(--shadow-pop)]"
          style={{
            left: pad.left + slot * hover + slot / 2,
            top: Math.max(y(Math.max(data[hover].value, 0)) - 58, 0),
          }}
        >
          <p className="font-medium text-ink">{data[hover].label}</p>
          <p className="mt-0.5 text-ink tabular">
            {data[hover].value < 0 ? 'Loss ' : ''}
            {format(Math.abs(data[hover].value))}
          </p>
          {data[hover].detail ? <p className="mt-0.5 text-stone">{data[hover].detail}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
