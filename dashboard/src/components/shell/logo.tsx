import { cn } from '@/lib/cn';

/**
 * The Zelqune arch mark, the same SVG as the storefront (frontend/src/shared/ui/logo.tsx,
 * redrawn from the owner's logo). It inherits the text colour.
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="490 359 274 343"
      className={cn('h-7 w-auto', className)}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path
        fillRule="evenodd"
        fill="currentColor"
        d="M490 702V495.5A136.5 136.5 0 0 1 763 495.5V702Z M573.25 483.5A63 63 0 0 1 696.75 483.5Z M490 483.5H733.2L714.7 503.5H490Z M643.5 503.5H714.7L527.5 702H490V668.5Z"
      />
    </svg>
  );
}

/** The wordmark as on the storefront: Cormorant Garamond capitals with wide tracking. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-wordmark text-[1.2rem] font-medium leading-none tracking-[0.32em] uppercase',
        className,
      )}
    >
      Zelqune
    </span>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 text-ink', className)}>
      <LogoMark className={compact ? 'h-6' : 'h-7'} />
      {compact ? null : <Wordmark />}
    </span>
  );
}
