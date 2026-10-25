import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Sparkline } from '@/components/charts/sparkline';
import { cn } from '@/lib/cn';

/**
 * Change against the previous period as a pill (▲ 12.4%). `invert` for costs, where up is bad.
 * Direction is carried by the arrow and the words, not by colour alone.
 */
export function Delta({ value, invert = false }: { value: number | null; invert?: boolean }) {
  if (value === null) return <span className="text-xs text-stone">No earlier data</span>;
  const up = value >= 0;
  const good = invert ? !up : up;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span
        className={cn(
          'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-semibold tabular',
          good ? 'bg-success/12 text-success' : 'bg-danger/10 text-danger',
        )}
      >
        <Icon className="size-3.5" aria-hidden />
        {Math.abs(value).toFixed(1)}%<span className="sr-only">{up ? ' up' : ' down'}</span>
      </span>
      <span className="text-stone">vs previous</span>
    </span>
  );
}

/** Icon chip tints: one hue per meaning, brand-warm first. */
const CHIP = {
  walnut: 'bg-walnut/12 text-walnut',
  brass: 'bg-[#d9b47a]/22 text-[#7a5c30] dark:text-[#d9b47a]',
  sage: 'bg-success/12 text-success',
  sky: 'bg-chart-a/12 text-chart-a',
  clay: 'bg-chart-b/12 text-chart-b',
} as const;
export type ChipTone = keyof typeof CHIP;

/**
 * A headline number with an icon chip, its change and an optional trend line (DashStack /
 * BankDash pattern); a link when `href` is set.
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
  tone = 'walnut',
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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.8125rem] font-medium text-stone">{label}</p>
          <p className="mt-1.5 truncate text-[1.65rem] leading-tight font-semibold tracking-[-0.025em] text-ink tabular">
            {value}
          </p>
        </div>
        {Icon ? (
          <span
            className={cn('grid size-10 shrink-0 place-items-center rounded-xl', CHIP[tone])}
            aria-hidden
          >
            <Icon className="size-[1.15rem]" strokeWidth={1.9} />
          </span>
        ) : href ? (
          <ArrowRight
            className="size-3.5 text-stone opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden
          />
        ) : null}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="min-w-0">
          {change !== undefined ? (
            <Delta value={change} invert={invert} />
          ) : hint ? (
            <span className="text-xs text-stone">{hint}</span>
          ) : null}
        </div>
        {spark ? <Sparkline values={spark} className="-mb-1 shrink-0" /> : null}
      </div>
    </>
  );
  const box =
    'relative block overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)] transition-[border-color,box-shadow,transform] duration-200';
  return href ? (
    <Link
      href={href}
      className={cn(
        box,
        'group hover:-translate-y-px hover:border-ink/20 hover:shadow-[var(--shadow-pop)]',
      )}
    >
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}
