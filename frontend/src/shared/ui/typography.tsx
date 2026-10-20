import { cn } from '@/shared/lib/cn';

export function Container({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('mx-auto w-full max-w-[1440px] px-5 md:px-10', className)} {...props} />
  );
}

/** Small uppercase label above headings, tracked like the wordmark. */
export function Eyebrow({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      className={cn(
        'text-[0.7rem] font-medium uppercase tracking-eyebrow text-stone [:lang(bn)_&]:tracking-normal [:lang(bn)_&]:text-[0.8rem]',
        className,
      )}
      {...props}
    />
  );
}

type Level = 'display' | 'h1' | 'h2' | 'h3';

const sizes: Record<Level, string> = {
  display: 'text-[3.1rem] leading-[0.98] sm:text-[4.4rem] lg:text-[6.2rem]',
  h1: 'text-[2.6rem] leading-[1.02] sm:text-[3.4rem] lg:text-[4.2rem]',
  h2: 'text-[2.1rem] leading-[1.05] sm:text-[2.8rem] lg:text-[3.4rem]',
  h3: 'text-[1.6rem] leading-[1.1] sm:text-[1.9rem]',
};

/** Display headings: Cormorant Garamond (Latin), Hind Siliguri on Bangla pages. */
export function Heading({
  as: Tag = 'h2',
  level = 'h2',
  className,
  ...props
}: React.ComponentProps<'h2'> & { as?: 'h1' | 'h2' | 'h3' | 'p'; level?: Level }) {
  return (
    <Tag
      className={cn(
        'font-display font-light tracking-[-0.01em] text-balance [:lang(bn)_&]:font-normal [:lang(bn)_&]:leading-[1.3]',
        sizes[level],
        className,
      )}
      {...props}
    />
  );
}

export function Lead({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p className={cn('text-base leading-relaxed text-ink/80 sm:text-lg', className)} {...props} />
  );
}
