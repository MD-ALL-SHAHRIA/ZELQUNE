import { type Dictionary } from '@/i18n/dictionaries/en';

/**
 * The brand line set huge, sliding sideways as the page scrolls past it (globals.css,
 * .giant-line). Decorative: the same line is the page's tagline, so it is hidden from
 * assistive tech. Without scroll timelines or with reduced motion it simply rests.
 */
export function GiantLine({ dict }: { dict: Dictionary }) {
  const line = dict.brand.tagline.replace(/[.।]$/, '');
  return (
    <div aria-hidden className="overflow-clip py-16 select-none sm:py-24">
      <p className="giant-line flex w-max items-center gap-[0.35em] font-display text-[clamp(4.5rem,13vw,12rem)] leading-none whitespace-nowrap text-ink [:lang(bn)_&]:leading-[1.3]">
        {[0, 1, 2].map((i) => (
          <span key={i} className="flex items-center gap-[0.35em]">
            <span className={i % 2 ? 'italic text-walnut [:lang(bn)_&]:not-italic' : undefined}>
              {line}
            </span>
            <span className="size-[0.12em] shrink-0 rotate-45 bg-walnut" />
          </span>
        ))}
      </p>
    </div>
  );
}
