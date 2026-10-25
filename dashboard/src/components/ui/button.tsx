import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'plain';
type Size = 'sm' | 'md' | 'icon' | 'icon-sm';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-accent)_82%,white),var(--color-accent))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),0_1px_2px_rgba(60,30,10,0.25),0_0_0_1px_color-mix(in_oklab,var(--color-accent)_80%,black)] hover:brightness-[1.06] dark:text-[#1b120c]',
  secondary:
    'border border-line bg-surface text-ink shadow-[0_1px_1px_rgba(36,28,24,0.04)] hover:border-ink/20 hover:bg-strip',
  ghost: 'text-ink/80 hover:bg-ink/6 hover:text-ink',
  danger: 'border border-danger/30 bg-surface text-danger hover:bg-danger/8',
  plain: 'text-ink underline-offset-4 hover:underline',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-[0.625rem] px-3 text-[0.8125rem]',
  md: 'h-10 gap-2 rounded-xl px-4 text-sm',
  icon: 'size-10 rounded-xl',
  'icon-sm': 'size-8 rounded-[0.625rem]',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    'inline-flex shrink-0 items-center justify-center font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
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
