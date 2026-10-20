import Link from 'next/link';
import { cn } from '@/shared/lib/cn';

type Variant = 'primary' | 'outline' | 'light' | 'ghost';
type Size = 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-[0.8rem] font-medium uppercase tracking-[0.16em] transition-colors duration-300 ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-45 [:lang(bn)_&]:text-[0.95rem] [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal';

const variants: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-walnut',
  outline: 'border border-ink text-ink hover:bg-ink hover:text-paper',
  light: 'border border-paper/80 text-paper hover:bg-paper hover:text-ink',
  ghost: 'text-ink underline-offset-[6px] hover:underline',
};

const sizes: Record<Size, string> = { md: 'h-11 px-6', lg: 'h-14 px-9' };

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], variant === 'ghost' ? 'h-auto px-0' : sizes[size], className);
}

export function Button({
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}
