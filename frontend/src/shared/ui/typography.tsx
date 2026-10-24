import { cn } from '@/shared/lib/cn';

export function Container({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('mx-auto w-full max-w-[1440px] px-5 md:px-10', className)} {...props} />
  );
}

/**
 * Small uppercase label above headings, tracked like the wordmark. `rule` adds a short hairline
 * before it (editorial sections); `tone="light"` for dark grounds.
 */
export function Eyebrow({
  className,
  rule = false,
  tone = 'default',
  children,
  ...props
}: React.ComponentProps<'p'> & { rule?: boolean; tone?: 'default' | 'light' | 'accent' }) {
  return (
    <p
      className={cn(
        'text-[0.68rem] font-medium uppercase leading-snug tracking-eyebrow [:lang(bn)_&]:text-[0.82rem] [:lang(bn)_&]:tracking-normal',
        tone === 'default' && 'text-stone',
        tone === 'light' && 'text-ivory/60',
        tone === 'accent' && 'text-walnut',
        rule && 'flex items-center gap-4',
        className,
      )}
      {...props}
    >
      {rule ? <span aria-hidden className="h-px w-8 shrink-0 bg-current opacity-50" /> : null}
      {children}
    </p>
  );
}

type Level = 'display' | 'h1' | 'h2' | 'h3' | 'h4';

/** Fluid scale: phones (390px) to wide screens, with tighter leading as size grows. */
const sizes: Record<Level, string> = {
  display:
    'text-[clamp(3rem,1.55rem+5.4vw,7.25rem)] leading-[0.96] tracking-[-0.022em] [:lang(bn)_&]:text-[clamp(2.4rem,1.35rem+3.5vw,5rem)] [:lang(bn)_&]:leading-[1.22]',
  h1: 'text-[clamp(2.55rem,1.75rem+3.1vw,4.6rem)] leading-[1] tracking-[-0.018em] [:lang(bn)_&]:text-[clamp(2.15rem,1.55rem+2.4vw,3.75rem)] [:lang(bn)_&]:leading-[1.26]',
  h2: 'text-[clamp(2.05rem,1.5rem+2.15vw,3.5rem)] leading-[1.04] tracking-[-0.014em] [:lang(bn)_&]:leading-[1.3]',
  h3: 'text-[clamp(1.55rem,1.3rem+0.9vw,2.05rem)] leading-[1.1] tracking-[-0.01em] [:lang(bn)_&]:leading-[1.32]',
  h4: 'text-[1.3rem] leading-[1.2] sm:text-[1.45rem] [:lang(bn)_&]:leading-[1.35]',
};

/** Display headings: Cormorant Garamond (Latin), Tiro Bangla on Bangla pages. */
export function Heading({
  as: Tag = 'h2',
  level = 'h2',
  className,
  ...props
}: React.ComponentProps<'h2'> & { as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p'; level?: Level }) {
  return (
    <Tag
      className={cn(
        'font-display font-medium text-balance [:lang(bn)_&]:font-normal [:lang(bn)_&]:tracking-normal',
        sizes[level],
        className,
      )}
      {...props}
    />
  );
}

/** Intro paragraph under a heading; `size="lg"` for hero and editorial openers. */
export function Lead({
  className,
  size = 'md',
  ...props
}: React.ComponentProps<'p'> & { size?: 'md' | 'lg' }) {
  return (
    <p
      className={cn(
        'leading-relaxed text-ink/75 text-pretty',
        size === 'md' ? 'text-base sm:text-[1.075rem]' : 'text-[1.075rem] sm:text-[1.25rem]',
        className,
      )}
      {...props}
    />
  );
}

/** A 1px rule; `fade` softens both ends (between editorial sections). */
export function Hairline({ className, fade = false }: { className?: string; fade?: boolean }) {
  return (
    <div aria-hidden className={cn(fade ? 'hairline-fade' : 'h-px bg-line', 'w-full', className)} />
  );
}
