import { cn } from '@/shared/lib/cn';

const control =
  'w-full border-0 border-b border-ink/25 bg-transparent px-0 py-3 text-base text-ink placeholder:text-stone/70 transition-colors focus:border-ink focus:outline-none focus-visible:outline-none aria-[invalid=true]:border-danger';

/** Label + control + error, with ids wired for accessibility. */
export function Field({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn('space-y-1', className)}>
      <label
        htmlFor={id}
        className="block text-[0.7rem] font-medium uppercase tracking-[0.16em] text-stone [:lang(bn)_&]:text-sm [:lang(bn)_&]:tracking-normal"
      >
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-stone">{hint}</p> : null}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      aria-describedby={props['aria-invalid'] ? `${props.id}-error` : undefined}
      className={cn(control, className)}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-24 resize-y', className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        control,
        'cursor-pointer appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 12 12%27%3E%3Cpath d=%27M2 4l4 4 4-4%27 fill=%27none%27 stroke=%27%2316120F%27 stroke-width=%271.2%27/%3E%3C/svg%3E")] bg-[length:12px] bg-[right_0.25rem_center] bg-no-repeat pr-8',
        className,
      )}
      {...props}
    />
  );
}
