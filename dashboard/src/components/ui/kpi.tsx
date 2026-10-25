import { ArrowDown, ArrowUp, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Sparkline } from '@/components/charts/sparkline';
import { cn } from '@/lib/cn';

/**
 * Change against the previous period, Northstar style: a circled arrow and a monospace figure.
 * `invert` for costs, where up is bad. Direction is in the arrow and the words.
 */
export function Delta({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null)
    return (
      <span className="font-mono text-[0.75rem] tracking-[0.06em] text-stone uppercase">
        No earlier data
      </span>
    );
  const up = value >= 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-mono text-[0.8125rem] font-medium tracking-[0.04em] uppercase tabular',
        good ? 'text-accent' : 'text-danger',
      )}
    >
      <span className="grid size-[1.125rem] place-items-center rounded-full border-[1.5px] border-current">
        <Icon className="size-2.5" strokeWidth={2.75} aria-hidden />
      </span>
      {Math.abs(value).toFixed(1)}%<span className="sr-only">{up ? ' up' : ' down'}</span>
      <span className="text-stone">vs prev</span>
    </span>
  );
}

/** Kept for pages that pass a tone; the Northstar card uses the strip label instead of chips. */
export type ChipTone = 'walnut' | 'brass' | 'sage' | 'sky' | 'clay';

/**
 * A headline number (Northstar KPI card): the label in a grey strip, then on white the big
 * number, its change and a smooth trend line over a faint grid. A link when `href` is set.
 */
export function Kpi({
  label,
  value,
  change,
  spark,
  href,
  invert,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  change?: number | null;
  spark?: number[];
  href?: string;
  /** Higher is worse (costs, cancellations): flips the colour of the change. */
  invert?: boolean;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: ChipTone;
}) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-3 px-5 py-3.5">
        <p className="truncate text-[0.9375rem] text-ink/70">{label}</p>
        {Icon ? (
          <Icon className="size-4 shrink-0 text-stone/80" strokeWidth={1.75} aria-hidden />
        ) : null}
      </div>
      <div className="-mx-px -mb-px flex min-h-[9.5rem] flex-1 flex-col rounded-[1.25rem] border border-line bg-surface px-5 pt-4 pb-3">
        <p className="truncate text-[2.25rem] leading-none font-normal tracking-[-0.035em] text-ink tabular">
          {value}
        </p>
        <div className="mt-3">
          {change !== undefined ? (
            <Delta value={change} invert={invert} />
          ) : hint ? (
            <span className="font-mono text-[0.75rem] tracking-[0.05em] text-stone uppercase">
              {hint}
            </span>
          ) : null}
        </div>
        {spark && spark.length > 1 ? <Sparkline values={spark} className="mt-auto pt-2" /> : null}
      </div>
    </>
  );
  const box =
    'flex min-w-0 flex-col rounded-[1.375rem] border border-line bg-strip transition-[border-color,box-shadow] duration-200';
  return href ? (
    <Link href={href} className={cn(box, 'hover:border-ink/20 hover:shadow-[var(--shadow-card)]')}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}
