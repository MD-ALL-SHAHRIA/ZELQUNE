import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import { SAMPLE } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { formatTaka } from '@/i18n/format';
import { href } from '@/shared/lib/site';
import { ButtonLink } from '@/shared/ui/button';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';
import { HeroSlides } from './hero-slides';

/* Words rise in one after another; the lamp glow behind the piece breathes; the photo settles
   from a slight zoom as the hero scrolls away (scroll-driven where supported, no JS). Three
   pieces cross-fade inside the frame over one 27 s cycle. Motion only when it is welcome. */
const HERO_CSS = `
@media (prefers-reduced-motion: no-preference) {
  .hero-rise { opacity: 0; animation: hero-rise 1.1s cubic-bezier(.22,1,.36,1) forwards; }
  .hero-glow { animation: hero-glow 7s ease-in-out infinite alternate; }
  .hero-slide { animation-duration: 27s; animation-iteration-count: infinite; animation-timing-function: ease-in-out; }
  @supports (animation-timeline: view()) {
    .hero-frame-img { animation: hero-settle linear both; animation-timeline: view(); animation-range: exit 0% exit 100%; }
  }
}
@keyframes hero-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes hero-glow { from { opacity: .55; transform: scale(.94); } to { opacity: .95; transform: scale(1.04); } }
@keyframes hero-settle { from { transform: scale(1); } to { transform: scale(1.08); } }
@keyframes hero-fade-2 { 0%, 27% { opacity: 0; } 33%, 69% { opacity: 1; } 70%, 100% { opacity: 0; } }
@keyframes hero-fade-3 { 0%, 60% { opacity: 0; } 66%, 94% { opacity: 1; } 100% { opacity: 0; } }
`;

const rise = (step: number) => ({ animationDelay: `${120 + step * 110}ms` });

/**
 * Editorial split hero (the owner's mockup): calm words on the left, the lit piece on the right
 * in a tall frame with a warm lamp glow behind it. On phones the piece comes first.
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
    <section className="relative isolate overflow-hidden bg-[linear-gradient(180deg,var(--color-paper)_0%,var(--color-sand)_100%)]">
      <style>{HERO_CSS}</style>
      <Container className="grid items-center gap-10 pb-16 pt-8 sm:pb-20 lg:min-h-[calc(100svh-11.5rem)] lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-14">
        <div className="order-2 max-w-xl space-y-7 lg:order-1">
          <Eyebrow className="hero-rise text-walnut" style={rise(0)}>
            {dict.landing.heroEyebrow}
          </Eyebrow>
          <Heading as="h1" level="display" className="hero-rise text-ink" style={rise(1)}>
            {dict.home.heroHeading}
          </Heading>
          <p
            className="hero-rise max-w-md text-base leading-relaxed text-stone sm:text-lg"
            style={rise(2)}
          >
            {dict.home.heroSubline}
          </p>
          <div
            className="hero-rise flex flex-wrap items-center gap-x-8 gap-y-4 pt-1"
            style={rise(3)}
          >
            <ButtonLink
              href={href(lang, productSlug ? `/products/${productSlug}` : '/shop')}
              size="lg"
              className="group gap-3"
            >
              {dict.home.cta}
              {pricePaisa ? (
                <span className="border-l border-paper/25 pl-3 normal-case tracking-normal">
                  {formatTaka(pricePaisa, lang)}
                </span>
              ) : null}
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform duration-500 ease-out-soft group-hover:translate-x-1"
              />
            </ButtonLink>
            <ButtonLink href="#craft" variant="link">
              {dict.landing.heroSecondary}
            </ButtonLink>
          </div>
          <div className="hero-rise space-y-3 pt-6" style={rise(4)}>
            <span aria-hidden className="block h-px w-10 bg-moss" />
            <p className="text-[0.66rem] font-medium uppercase tracking-eyebrow text-stone [:lang(bn)_&]:text-[0.8rem] [:lang(bn)_&]:tracking-normal">
              {dict.landing.heroTrust}
            </p>
          </div>
        </div>

        <div className="relative order-1 mx-auto w-full max-w-[26rem] xl:max-w-[29rem] lg:order-2">
          {/* The lamp light the piece casts on the wall. */}
          <div
            aria-hidden
            className="hero-glow absolute -inset-[12%] -z-10 rounded-full bg-[radial-gradient(closest-side,rgba(246,201,135,0.55),rgba(227,168,87,0.18)_55%,transparent)]"
          />
          <div className="relative isolate aspect-[2/3] overflow-hidden rounded-t-[999px] bg-sand shadow-[0_50px_100px_-50px_rgba(53,58,48,0.55)]">
            <Image
              src={SAMPLE.moonPanel.src}
              alt=""
              fill
              preload
              sizes="(min-width: 1024px) 29rem, 92vw"
              className="hero-frame-img -z-20 object-cover"
            />
            <HeroSlides
              sizes="(min-width: 1024px) 29rem, 92vw"
              slides={[{ src: SAMPLE.halfMoonPlanter.src }, { src: SAMPLE.curveShelf.src }]}
            />
          </div>
          <p className="mt-3 text-right text-[0.6rem] leading-snug text-stone/80">
            {dict.landing.sampleNote}
          </p>
        </div>
      </Container>
    </section>
  );
}
