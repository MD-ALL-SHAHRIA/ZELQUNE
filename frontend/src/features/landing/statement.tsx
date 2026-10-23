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
 * The one light band on the dark page: an ivory field with the brand's promises drifting by in
 * the display italic, then the sentence that says what Zelqune is for.
 */
export function Statement({ dict }: { dict: Dictionary }) {
  const words = dict.premium.marquee;
  const run = (hidden: boolean) => (
    <ul aria-hidden={hidden || undefined} className="flex shrink-0 items-center">
      {words.map((w) => (
        <li key={w} className="flex items-center">
          <span className="px-6 font-display text-[2rem] italic leading-none sm:px-10 sm:text-[3.2rem] lg:text-[4.2rem] [:lang(bn)_&]:not-italic">
            {w}
          </span>
          <span aria-hidden className="size-2 shrink-0 rotate-45 bg-walnut" />
        </li>
      ))}
    </ul>
  );
  return (
    <section className="bg-ink py-20 text-paper sm:py-28">
      <style>{MARQUEE_CSS}</style>
      <div className="marquee overflow-hidden border-y border-paper/15 py-8 sm:py-10">
        <div className="marquee-run flex w-max">
          {run(false)}
          {run(true)}
        </div>
      </div>
      <Container className="reveal mt-14 flex flex-col items-center text-center sm:mt-20">
        <p className="max-w-[22ch] text-balance font-display text-[1.9rem] leading-[1.12] tracking-[-0.01em] sm:text-[2.8rem] lg:text-[3.6rem] [:lang(bn)_&]:font-normal [:lang(bn)_&]:leading-[1.35] [:lang(bn)_&]:tracking-normal">
          {dict.premium.statement}
        </p>
      </Container>
    </section>
  );
}
