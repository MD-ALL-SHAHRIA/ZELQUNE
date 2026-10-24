import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

const control =
  'w-full rounded-lg border border-line bg-surface text-sm text-ink shadow-[var(--shadow-card)] transition-[border-color,box-shadow] placeholder:text-stone/60 hover:border-ink/25 focus:border-walnut focus:outline-none focus:ring-3 focus:ring-walnut/15 disabled:opacity-60';

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return <input className={cn(control, 'h-9 px-3', className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea className={cn(control, 'min-h-24 px-3 py-2 leading-relaxed', className)} {...props} />
  );
}

export function Select({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className={cn('relative', className)}>
      <select className={cn(control, 'h-9 appearance-none pr-9 pl-3')} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-stone"
      />
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-[0.8125rem] font-medium text-ink">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-stone">{hint}</span>
      ) : null}
    </label>
  );
}
