import { cn } from '@/lib/cn';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'rose';

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink/[0.045] text-ink/65 ring-ink/[0.06]',
  success: 'bg-success/[0.08] text-success ring-success/15',
  warning: 'bg-warning/[0.09] text-warning ring-warning/20',
  danger: 'bg-danger/[0.07] text-danger ring-danger/15',
  info: 'bg-[#2a78d6]/[0.07] text-[#1f63b8] ring-[#2a78d6]/15 dark:text-[#8ab8f2]',
  accent: 'bg-accent-soft text-accent ring-accent/15',
  rose: 'bg-[#d6336c]/[0.07] text-[#b8285c] ring-[#d6336c]/15 dark:text-[#f08cb0]',
};

/**
 * Status chip (Northstar pattern): tinted, monospace capitals, an optional leading icon. The
 * word always names the state, so it never rests on colour alone.
 */
export function Badge({
  tone = 'neutral',
  children,
  icon,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 font-mono text-[0.6875rem] font-medium tracking-[0.04em] whitespace-nowrap uppercase ring-1 ring-inset [&_svg]:size-3.5',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
