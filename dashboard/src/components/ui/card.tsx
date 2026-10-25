import { cn } from '@/lib/cn';

export function Card({ className, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-2xl border border-line bg-surface shadow-[var(--shadow-card)]',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-4 pb-3', className)}>
      <div className="min-w-0">
        <h2 className="text-[0.9375rem] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-[0.8125rem] text-stone">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-5 pb-5', className)} {...props} />;
}

/** A labelled row of facts (key on the left, value on the right). */
export function Facts({ items }: { items: [React.ReactNode, React.ReactNode][] }) {
  return (
    <dl className="divide-y divide-line text-sm">
      {items.map(([k, v], i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
        >
          <dt className="text-stone">{k}</dt>
          <dd className="text-right text-ink tabular">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
