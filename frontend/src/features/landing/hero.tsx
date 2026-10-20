import Image from 'next/image';
import { SAMPLE } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { formatTaka } from '@/i18n/format';
import { href } from '@/shared/lib/site';
import { ButtonLink } from '@/shared/ui/button';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';
import { HeroSlides } from './hero-slides';

/* One 27 s cycle: room one (the LCP photo, always underneath), then two, then three, each
   cross-fading over ~1.6 s with a slow Ken Burns drift. Motion only when it is welcome. */
const HERO_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .hero-kenburns { animation: hero-kb 27s ease-in-out infinite alternate; transform-origin: 60% 50%; }
  .hero-slide { animation-duration: 27s; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
  .hero-cue-dot { animation: hero-cue 2.6s cubic-bezier(.6,0,.3,1) infinite; }
}
@keyframes hero-kb { from { transform: scale(1); } to { transform: scale(1.08); } }
@keyframes hero-fade-2 { 0%, 27% { opacity: 0; } 33%, 69% { opacity: 1; } 70%, 100% { opacity: 0; } }
@keyframes hero-fade-3 { 0%, 60% { opacity: 0; } 66%, 94% { opacity: 1; } 100% { opacity: 0; } }
@keyframes hero-cue { 0% { transform: translateY(-100%); } 60%, 100% { transform: translateY(260%); } }
`;

/**
 * Full-bleed cinematic hero (RH scale, warm Zelqune light): three rooms cross-fade slowly
 * behind the headline. The words sit well above the fold line, with a quiet scroll cue below.
 */
export function Hero({
  lang,
  dict,
  productSlug,
  pricePaisa,
}: {
  lang: Locale;
  dict: Dictionary;
  productSlug?: string;
  pricePaisa?: number;
}) {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-6.5rem)] items-end overflow-hidden bg-ink text-paper">
      <style>{HERO_CSS}</style>
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        <Image
          src={SAMPLE.homeHero.src}
          alt=""
          fill
          preload
          sizes="100vw"
          className="hero-kenburns object-cover object-[60%_center]"
        />
      </div>
      <HeroSlides
        slides={[
          { src: SAMPLE.bedroom.src, position: 'center 45%' },
          { src: SAMPLE.hotelLobby.src, position: 'center' },
        ]}
      />
      {/* Warm, layered shade: dark at the foot for the words, a soft vignette at the left. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(22,18,15,0.35)_0%,rgba(22,18,15,0)_22%,rgba(22,18,15,0.12)_48%,rgba(22,18,15,0.82)_100%),radial-gradient(90%_70%_at_0%_100%,rgba(22,18,15,0.45),transparent_70%)]"
      />
      <Container className="pb-32 pt-32 sm:pb-36 lg:pb-44">
        <div className="max-w-3xl space-y-6">
          <Eyebrow className="text-paper/75">{dict.landing.heroEyebrow}</Eyebrow>
          <Heading as="h1" level="display">
            {dict.home.heroHeading}
          </Heading>
          <p className="max-w-xl text-base leading-relaxed text-paper/85 sm:text-lg">
            {dict.home.heroSubline}
          </p>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            {productSlug ? (
              <ButtonLink
                href={href(lang, `/products/${productSlug}`)}
                size="lg"
                className="bg-paper text-ink hover:bg-glow"
              >
                {dict.home.cta}
                {pricePaisa ? (
                  <span className="border-l border-ink/25 pl-3 normal-case tracking-normal">
                    {formatTaka(pricePaisa, lang)}
                  </span>
                ) : null}
              </ButtonLink>
            ) : null}
            <ButtonLink href="#craft" variant="light" size="lg">
              {dict.landing.heroSecondary}
            </ButtonLink>
          </div>
        </div>
      </Container>

      {/* Scroll cue: a hairline with a drifting point of light. */}
      <div
        aria-hidden
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 text-paper/70 sm:bottom-8"
      >
        <span className="text-[0.62rem] font-medium uppercase tracking-eyebrow [:lang(bn)_&]:text-[0.75rem] [:lang(bn)_&]:tracking-normal">
          {dict.premium.scroll}
        </span>
        <span className="relative block h-10 w-px overflow-hidden bg-paper/25 sm:h-12">
          <span className="hero-cue-dot absolute inset-x-0 top-0 block h-1/3 bg-glow" />
        </span>
      </div>
      <p className="absolute bottom-3 right-4 max-w-[9rem] text-right text-[0.6rem] leading-snug text-paper/55 sm:max-w-none">
        {dict.landing.sampleNote}
      </p>
    </section>
  );
}
