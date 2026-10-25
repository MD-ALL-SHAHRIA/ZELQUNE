'use client';

import { cn } from '@/lib/cn';

/** Segmented tabs (filters, ranges, languages), each with an optional count. */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: React.ReactNode; count?: number }[];
  label: string;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('inline-flex rounded-lg bg-ink/6 p-0.5', className)}
    >
      {items.map((item) => {
        const on = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(item.value)}
            className={cn(
              'inline-flex h-7 items-center gap-1.5 rounded-md px-3 text-[0.8125rem] font-medium whitespace-nowrap transition-colors',
              on ? 'bg-surface text-ink shadow-[var(--shadow-card)]' : 'text-stone hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[0.6875rem] tabular',
                  on ? 'bg-ink/8' : 'bg-ink/5',
                )}
              >
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/** Underline tabs for a page's sections. */
export function LineTabs<T extends string>({
  value,
  onChange,
  items,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: React.ReactNode; count?: number }[];
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex gap-1 overflow-x-auto border-b border-line"
    >
      {items.map((item) => {
        const on = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(item.value)}
            className={cn(
              '-mb-px inline-flex h-10 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors',
              on ? 'border-ink text-ink' : 'border-transparent text-stone hover:text-ink',
            )}
          >
            {item.label}
            {item.count !== undefined ? (
              <span className="rounded-full bg-ink/6 px-1.5 text-[0.6875rem] text-stone tabular">
                {item.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
