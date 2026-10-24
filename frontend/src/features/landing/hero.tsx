import { ArrowRight } from 'lucide-react';
import { productName } from '@/features/catalog/product-copy';
import { HERO_SCENES } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatTaka } from '@/i18n/format';
import { type ProductSummary } from '@/shared/api/types';
import { href } from '@/shared/lib/site';
import { ButtonLink } from '@/shared/ui/button';
import { Container, Eyebrow } from '@/shared/ui/typography';
import { HeroScenes, type Scene } from './hero-scenes.client';

/* Scenes cross-fade with a slow drift; the words rise in one after another. Motion only when it
   is welcome. */
const HERO_CSS = `
.scene { transition: opacity 1.2s cubic-bezier(.4,0,.2,1); }
.scene-off { opacity: 0; }
.scene-on { opacity: 1; }
@media (prefers-reduced-motion: no-preference) {
  .hero-rise { opacity: 0; animation: hero-rise 1.1s cubic-bezier(.22,1,.36,1) forwards; }
  .scene-on .scene-drift { animation: scene-drift 9s ease-out both; }
  .scene-caption { animation: hero-rise .9s cubic-bezier(.22,1,.36,1); }
  .scene-progress { animation-name: scene-progress; animation-timing-function: linear; animation-fill-mode: both; }
}
@media (prefers-reduced-motion: reduce) { .scene { transition: none; } }
@keyframes hero-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes scene-drift { from { transform: scale(1); } to { transform: scale(1.06); } }
@keyframes scene-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
`;

const rise = (step: number) => ({ animationDelay: `${120 + step * 110}ms` });

/**
 * Cinematic hero: full-bleed room scenes, each with one of our pieces lit on the wall, the words
 * over a warm shade on the left. Names and prices come from the catalog.
 */
export function Hero({
  lang,
  dict,
  products,
  featuredSlug,
}: {
  lang: Locale;
  dict: Dictionary;
  products: ProductSummary[];
  featuredSlug?: string;
}) {
  const l = dict.landing;
  const scenes: Scene[] = HERO_SCENES.flatMap((s) => {
    const product = products.find((p) => p.slug === s.productSlug);
    if (!product) return [];
    return [
      {
        src: s.src,
        position: s.position,
        name: productName(product, lang, dict),
        href: href(lang, `/products/${product.slug}`),
        price: product.fromPrice
          ? fill(dict.ui.from, { price: formatTaka(product.fromPrice.amountPaisa, lang) })
          : undefined,
      },
    ];
  });
  const lead = products.find((p) => p.slug === featuredSlug) ?? products[0];

  return (
    <section className="hero-root tone-dark">
      <style>{HERO_CSS}</style>
      <HeroScenes scenes={scenes} labels={l.heroWall}>
        <Container className="pb-4 lg:pb-24">
          <div className="max-w-[36rem] space-y-6">
            <Eyebrow className="hero-rise text-ivory/85" style={rise(0)}>
              {l.heroEyebrow}
            </Eyebrow>
            <h1
              className="hero-rise font-display text-[clamp(2.6rem,1.6rem+3.6vw,5rem)] leading-[1.02] tracking-[-0.02em] text-balance [:lang(bn)_&]:text-[clamp(2.2rem,1.5rem+2.6vw,3.8rem)] [:lang(bn)_&]:leading-[1.25] [:lang(bn)_&]:tracking-normal"
              style={rise(1)}
            >
              {dict.home.heroHeading}{' '}
              <em className="text-glow [:lang(bn)_&]:not-italic">{dict.home.heroHeadingAccent}</em>
            </h1>
            <p
              className="hero-rise max-w-md text-base leading-relaxed text-ivory/90 sm:text-lg"
              style={rise(2)}
            >
              {dict.home.heroSubline}
            </p>
            <div
              className="hero-rise flex flex-wrap items-center gap-x-8 gap-y-4 pt-1"
              style={rise(3)}
            >
              <ButtonLink
                href={href(lang, '/shop')}
                variant="light"
                size="lg"
                className="group gap-3"
              >
                {dict.home.explore}
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform duration-500 ease-out-soft group-hover:translate-x-1"
                />
              </ButtonLink>
              {lead ? (
                <ButtonLink href={href(lang, `/products/${lead.slug}`)} variant="linkLight">
                  {dict.home.cta}
                </ButtonLink>
              ) : null}
            </div>
          </div>
        </Container>
      </HeroScenes>
    </section>
  );
}
