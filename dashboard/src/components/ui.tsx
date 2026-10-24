import { cn } from '@/lib/cn';

type ButtonProps = React.ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
};

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50',
        size === 'md' ? 'h-10 px-4 text-sm' : 'h-8 px-3 text-[0.8rem]',
        variant === 'primary' && 'bg-ink text-paper hover:bg-walnut',
        variant === 'secondary' && 'border border-line bg-surface text-ink hover:bg-sand',
        variant === 'ghost' && 'text-ink hover:bg-sand',
        variant === 'danger' && 'border border-danger/40 text-danger hover:bg-danger/10',
        className,
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink placeholder:text-stone/70 focus:border-walnut focus:outline-none',
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-20 w-full rounded-md border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-walnut focus:outline-none',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-ink focus:border-walnut focus:outline-none',
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block space-y-1.5', className)}>
      <span className="block text-[0.78rem] font-medium text-stone">{label}</span>
      {children}
      {hint ? <span className="block text-[0.72rem] text-stone/80">{hint}</span> : null}
    </label>
  );
}

export function Card({ className, ...props }: React.ComponentProps<'section'>) {
  return (
    <section
      className={cn('rounded-xl border border-line bg-surface p-5 sm:p-6', className)}
      {...props}
    />
  );
}

export function CardTitle({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="font-display text-xl font-medium">{children}</h2>
      {aside}
    </div>
  );
}

const TONES: Record<string, string> = {
  green: 'bg-success/12 text-success',
  amber: 'bg-warning/12 text-warning',
  red: 'bg-danger/12 text-danger',
  stone: 'bg-sand text-stone',
};
export function Badge({
  tone = 'stone',
  children,
}: {
  tone?: keyof typeof TONES;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-[0.72rem] font-medium',
        TONES[tone],
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-medium sm:text-4xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-stone">{description}</p> : null}
      </div>
      {actions ? <div className="flex gap-2">{actions}</div> : null}
    </div>
  );
}

export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'error' | 'ok';
  children: React.ReactNode;
}) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-md px-3 py-2 text-sm',
        tone === 'error' && 'bg-danger/10 text-danger',
        tone === 'ok' && 'bg-success/10 text-success',
        tone === 'info' && 'bg-sand text-stone',
      )}
    >
      {children}
    </p>
  );
}
