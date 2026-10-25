import { Children, isValidElement } from 'react';
import { cn } from '@/lib/cn';

/**
 * Two-tone card (Northstar pattern): a whisper-grey frame whose header strip holds the title,
 * and a white inset panel for everything else. Without a CardHeader the card is one white panel.
 */
export function Card({ className, children, ...props }: React.ComponentProps<'section'>) {
  const all = Children.toArray(children);
  const header = all.filter((c) => isValidElement(c) && c.type === CardHeader);
  const body = all.filter((c) => !(isValidElement(c) && c.type === CardHeader));
  if (!header.length) {
    return (
      <section
        className={cn(
          'min-w-0 overflow-hidden rounded-[1.25rem] border border-line bg-surface',
          className,
        )}
        {...props}
      >
        {children}
      </section>
    );
  }
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col rounded-[1.375rem] border border-line bg-strip',
        className,
      )}
      {...props}
    >
      {header}
      <div className="-mx-px -mb-px min-w-0 flex-1 overflow-hidden rounded-[1.25rem] border border-line bg-surface pt-4">
        {body}
      </div>
    </section>
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
    <div className={cn('flex items-center justify-between gap-4 px-5 py-3.5', className)}>
      <div className="min-w-0">
        <h2 className="text-[0.9375rem] font-normal text-ink/70">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-stone">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('px-5 pb-5', className)} {...props} />;
}

/** A labelled row of facts (key on the left, value on the right), dashed separators. */
export function Facts({ items }: { items: [React.ReactNode, React.ReactNode][] }) {
  return (
    <dl className="text-sm">
      {items.map(([k, v], i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 border-t border-dashed border-line py-2.5 first:border-t-0 first:pt-0 last:pb-0"
        >
          <dt className="text-stone">{k}</dt>
          <dd className="text-right text-ink tabular">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
