import { type Dictionary } from '@/i18n/dictionaries/en';
import { Container } from '@/shared/ui/typography';

/* The words drift left forever (two identical runs, shifted by half). Paused for reduced motion
   and while the pointer rests on the band. */
const MARQUEE_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .marquee-run { animation: marquee 48s linear infinite; }
  .marquee:hover .marquee-run { animation-play-state: paused; }
}
@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
`;

/**
 * The brand's sentence on cream, then its promises drifting by on a slim walnut ribbon that
 * runs straight into the dark Services band below (the ribbon is the seam between light and
 * dark, and the page's accent).
 */
export function Statement({ dict }: { dict: Dictionary }) {
  const words = dict.premium.marquee;
  const run = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {words.map((w) => (
        <li key={w} className="flex items-center">
          <span className="px-6 font-display text-[1.5rem] leading-none italic sm:px-9 sm:text-[2rem] lg:text-[2.4rem] [:lang(bn)_&]:not-italic">
            {w}
          </span>
          <span aria-hidden className="size-1.5 shrink-0 rotate-45 bg-current opacity-60" />
        </li>
      ))}
    </ul>
  );
  return (
    <section className="bg-cream text-ink">
      <style>{MARQUEE_CSS}</style>
      <Container className="reveal flex flex-col items-center py-20 text-center sm:py-24 lg:py-28">
        {/* A small brass mark: a rule, a diamond, a rule. */}
        <span aria-hidden className="mb-9 flex items-center gap-3 text-walnut">
          <span className="h-px w-10 bg-current" />
          <span className="size-1.5 rotate-45 bg-current" />
          <span className="h-px w-10 bg-current" />
        </span>
        <p className="max-w-[24ch] font-display text-[2rem] leading-[1.12] tracking-[-0.01em] text-balance sm:text-[2.8rem] lg:text-[3.5rem] [:lang(bn)_&]:font-normal [:lang(bn)_&]:leading-[1.35] [:lang(bn)_&]:tracking-normal">
          {dict.premium.statement}
        </p>
      </Container>
      <div className="marquee overflow-hidden bg-walnut py-5 text-paper sm:py-6">
        <div className="marquee-run flex w-max">
          {run(false)}
          {run(true)}
        </div>
      </div>
    </section>
  );
}
