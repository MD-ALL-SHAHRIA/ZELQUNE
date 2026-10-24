import { cn } from '@/shared/lib/cn';

/**
 * The Zelqune arch mark, redrawn as SVG from the owner's logo (assets/brand). It inherits the
 * text colour, so it works on paper (ink) and on dark sections (paper).
 */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="490 359 274 343"
      className={cn('h-8 w-auto', className)}
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

/** Wordmark set like the logo: classical serif capitals with wide tracking. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-wordmark text-[1.35rem] font-medium uppercase leading-none tracking-wordmark',
        className,
      )}
    >
      Zelqune
    </span>
  );
}

export function Logo({ className, stacked = false }: { className?: string; stacked?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-ink',
        stacked ? 'flex-col gap-3' : 'gap-3',
        className,
      )}
    >
      <LogoMark className={stacked ? 'h-12' : 'h-7'} />
      <Wordmark className={stacked ? 'text-3xl' : undefined} />
    </span>
  );
}
