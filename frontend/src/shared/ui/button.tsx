import Link from 'next/link';
import { cn } from '@/shared/lib/cn';

/**
 * primary   ink block; a walnut fill sweeps in on hover
 * secondary quiet sand block for second actions on paper
 * outline   ink hairline box; fills with ink on hover
 * light     paper hairline box for dark or photo grounds
 * ghost     text with an underline on hover (kept for older call sites)
 * link      editorial text link: underline at rest that redraws on hover
 * linkLight the link variant for dark grounds
 */
type Variant = 'primary' | 'secondary' | 'outline' | 'light' | 'ghost' | 'link' | 'linkLight';
type Size = 'sm' | 'md' | 'lg';

const base =
  'relative isolate inline-flex items-center justify-center gap-2.5 overflow-hidden whitespace-nowrap text-[0.74rem] font-medium uppercase tracking-[0.18em] transition-[color,background-color,border-color,opacity] duration-500 ease-out-soft focus-visible:outline-2 focus-visible:outline-offset-[3px] disabled:pointer-events-none disabled:opacity-45 [:lang(bn)_&]:text-[0.95rem] [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal';

/** A fill that sweeps in from the left on hover (behind the label). */
const sweep =
  'before:absolute before:inset-0 before:-z-10 before:origin-right before:scale-x-0 before:transition-transform before:duration-700 before:ease-out-soft hover:before:origin-left hover:before:scale-x-100 motion-reduce:before:hidden';

const variants: Record<Variant, string> = {
  primary: cn(sweep, 'bg-ink text-paper before:bg-walnut motion-reduce:hover:bg-walnut'),
  secondary: 'bg-sand text-ink hover:bg-line',
  outline: cn(
    sweep,
    'border border-ink/80 text-ink before:bg-ink hover:border-ink hover:text-paper motion-reduce:hover:bg-ink',
  ),
  light: cn(
    sweep,
    'border border-ivory/70 text-ivory before:bg-ivory hover:border-ivory hover:text-espresso motion-reduce:hover:bg-ivory',
  ),
  ghost: 'link-reveal text-ink',
  link: 'link-underline text-ink',
  linkLight: 'link-underline text-ivory',
};

const textOnly: Variant[] = ['ghost', 'link', 'linkLight'];

const sizes: Record<Size, string> = { sm: 'h-10 px-5', md: 'h-12 px-7', lg: 'h-14 px-10' };

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(
    base,
    variants[variant],
    textOnly.includes(variant) ? 'h-auto overflow-visible px-0' : sizes[size],
    className,
  );
}

/**
 * On hover a plain-text label rolls up and its copy rolls in from below (the copy is CSS
 * generated content, so screen readers and tests still see one label). Text-only variants and
 * labels with icons stay as they are.
 */
function Label({ variant, children }: { variant?: Variant; children: React.ReactNode }) {
  if (typeof children !== 'string' || textOnly.includes(variant ?? 'primary')) return children;
  return (
    <span className="roll" data-label={children}>
      <span>{children}</span>
    </span>
  );
}

export function Button({
  variant,
  size,
  className,
  children,
  ...props
}: React.ComponentProps<'button'> & { variant?: Variant; size?: Size }) {
  return (
    <button className={buttonClass(variant, size, className)} {...props}>
      <Label variant={variant}>{children}</Label>
    </button>
  );
}

export function ButtonLink({
  variant,
  size,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link className={buttonClass(variant, size, className)} {...props}>
      <Label variant={variant}>{children}</Label>
    </Link>
  );
}
