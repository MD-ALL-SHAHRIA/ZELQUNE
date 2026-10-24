import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'plain';
type Size = 'sm' | 'md' | 'icon' | 'icon-sm';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-ink text-paper shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_1px_2px_rgba(0,0,0,0.18)] hover:bg-ink/90',
  secondary:
    'border border-line bg-surface text-ink shadow-[var(--shadow-card)] hover:border-ink/25 hover:bg-cream',
  ghost: 'text-ink/80 hover:bg-ink/6 hover:text-ink',
  danger: 'border border-danger/30 bg-surface text-danger hover:bg-danger/8',
  plain: 'text-ink underline-offset-4 hover:underline',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-[0.8125rem]',
  md: 'h-9 gap-2 px-3.5 text-sm',
  icon: 'size-9',
  'icon-sm': 'size-8',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
    VARIANTS[variant],
    variant !== 'plain' && SIZES[size],
    className,
  );
}

export function Button({
  variant,
  size,
  className,
  type = 'button',
  ...props
}: React.ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}
