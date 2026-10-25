'use client';

import { cn } from '@/lib/cn';

/** On/off switch with a visible label (role=switch). */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cn('flex items-start gap-3', disabled ? 'opacity-60' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-walnut',
          checked ? 'bg-ink' : 'bg-ink/15',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-4 rounded-full bg-paper shadow transition-transform',
            checked && 'translate-x-4',
          )}
        />
      </button>
      <span>
        <span className="block text-[0.8125rem] font-medium text-ink">{label}</span>
        {description ? <span className="block text-xs text-stone">{description}</span> : null}
      </span>
    </label>
  );
}
