import { type Dictionary } from '@/i18n/dictionaries/en';
import { Container } from '@/shared/ui/typography';

/**
 * A pause in the page: one sentence set very large in the display serif, centred under a small
 * hairline arch, with nothing else around it.
 */
export function Statement({ dict }: { dict: Dictionary }) {
  return (
    <section className="glow relative py-28 sm:py-40 lg:py-56">
      <Container className="reveal flex flex-col items-center text-center">
        <span
          aria-hidden
          className="mb-10 block h-14 w-10 rounded-t-full border border-b-0 border-walnut/50 sm:mb-14 sm:h-16 sm:w-11"
        />
        <p className="max-w-[18ch] text-balance font-display text-[2.4rem] font-light leading-[1.08] tracking-[-0.015em] sm:text-[3.6rem] lg:max-w-[20ch] lg:text-[5rem] [:lang(bn)_&]:max-w-[22ch] [:lang(bn)_&]:font-normal [:lang(bn)_&]:leading-[1.35] [:lang(bn)_&]:tracking-normal lg:[:lang(bn)_&]:text-[3.9rem]">
          {dict.premium.statement}
        </p>
      </Container>
    </section>
  );
}
