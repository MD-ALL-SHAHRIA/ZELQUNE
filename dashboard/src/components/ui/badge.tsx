import { cn } from '@/lib/cn';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const TONES: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: 'bg-ink/6 text-ink/80 ring-ink/10', dot: 'bg-stone' },
  success: { pill: 'bg-success/10 text-success ring-success/20', dot: 'bg-success' },
  warning: { pill: 'bg-warning/10 text-warning ring-warning/25', dot: 'bg-warning' },
  danger: { pill: 'bg-danger/10 text-danger ring-danger/20', dot: 'bg-danger' },
  info: {
    pill: 'bg-[#2a78d6]/10 text-[#1f5fae] ring-[#2a78d6]/20 dark:text-[#7fb0f0]',
    dot: 'bg-[#2a78d6]',
  },
  accent: { pill: 'bg-walnut/10 text-walnut ring-walnut/20', dot: 'bg-walnut' },
};

/** Status pill: a dot plus a word, so state never rests on colour alone. */
export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        TONES[tone].pill,
        className,
      )}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', TONES[tone].dot)} />
      {children}
    </span>
  );
}
