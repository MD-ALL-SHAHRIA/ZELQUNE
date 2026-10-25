import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { Sparkline } from '@/components/charts/sparkline';
import { cn } from '@/lib/cn';

/** Change against the previous period. `invert` for costs, where up is bad. */
export function Delta({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null) return <span className="text-xs text-stone">No earlier data</span>;
  const up = value >= 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium tabular',
        good ? 'text-success' : 'text-danger',
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {Math.abs(value).toFixed(1)}%<span className="sr-only">{up ? ' up' : ' down'}</span>
      <span className="ml-1 font-normal text-stone">vs previous</span>
    </span>
  );
}

/** A headline number with its change and an optional trend line; a link when `href` is set. */
export function Kpi({
  label,
  value,
  change,
  spark,
  href,
  invert,
  hint,
}: {
  label: string;
  value: string;
  change?: number | null;
  spark?: number[];
  href?: string;
  /** Higher is worse (costs, cancellations): flips the colour of the change. */
  invert?: boolean;
  hint?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[0.8125rem] text-stone">{label}</p>
        {href ? (
          <ArrowRight
            className="size-3.5 text-stone opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        ) : null}
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-2xl font-semibold tracking-[-0.02em] text-ink tabular">
            {value}
          </p>
          <div className="mt-1">
            {change !== undefined ? (
              <Delta value={change} invert={invert} />
            ) : hint ? (
              <span className="text-xs text-stone">{hint}</span>
            ) : null}
          </div>
        </div>
        {spark ? <Sparkline values={spark} className="shrink-0" /> : null}
      </div>
    </>
  );
  const box =
    'block rounded-xl border border-line bg-surface p-4 shadow-[var(--shadow-card)] transition-colors';
  return href ? (
    <Link href={href} className={cn(box, 'group hover:border-ink/25')}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}
