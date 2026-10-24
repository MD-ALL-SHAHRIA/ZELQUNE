import { ArrowRight } from 'lucide-react';
import { productImages } from '@/features/catalog/product-images';
import { productName } from '@/features/catalog/product-copy';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatTaka } from '@/i18n/format';
import { type ProductSummary } from '@/shared/api/types';
import { href } from '@/shared/lib/site';
import { ButtonLink } from '@/shared/ui/button';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';
import { HeroWall, type WallPiece } from './hero-wall.client';

/* A gallery of walls: the row slides (transform only); the wall in front stands full size with
   a soft cast shadow, the ones waiting are smaller and dimmer. The words rise in one after
   another. Motion only when it is welcome. */
const HERO_CSS = `
.gallery-clip { clip-path: inset(-12% -100vw -12% 0); }
.gallery-wall { box-shadow: 0 40px 80px -42px rgba(43,30,25,.5); }
.gallery-wall-back { opacity: .5; transform: scale(.86); }
.gallery-wall-back:hover { opacity: .75; }
@media (prefers-reduced-motion: no-preference) {
  .hero-rise { opacity: 0; animation: hero-rise 1.1s cubic-bezier(.22,1,.36,1) forwards; }
  .gallery-track { transition: transform 1.15s cubic-bezier(.65,0,.25,1); will-change: transform; }
  .gallery-wall { transition: transform 1.15s cubic-bezier(.65,0,.25,1), opacity 1.15s ease; }
  .wall-caption { animation: hero-rise .9s cubic-bezier(.22,1,.36,1); }
  .wall-progress { animation-name: wall-progress; animation-timing-function: linear; animation-fill-mode: both; }
}
@keyframes hero-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes wall-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
`;

const rise = (step: number) => ({ animationDelay: `${120 + step * 110}ms` });

const MAX_PIECES = 6;

/**
 * A gallery of walls: each piece's own photo, whole, in a row that slides to the next wall
 * every few seconds; the words on the left. Real catalog photos replace the sample renders
 * automatically (productImages).
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
  const ordered = [
    ...products.filter((p) => p.slug === featuredSlug),
    ...products.filter((p) => p.slug !== featuredSlug),
  ].slice(0, MAX_PIECES);
  const pieces: WallPiece[] = ordered.flatMap((p) => {
    const name = productName(p, lang, dict);
    const [image] = productImages(p.primaryMedia ? [p.primaryMedia] : [], name, lang, p.slug);
    if (!image) return [];
    return [
      {
        src: image.src,
        name,
        width: image.width,
        height: image.height,
        href: href(lang, `/products/${p.slug}`),
        price: p.fromPrice
          ? fill(dict.ui.from, { price: formatTaka(p.fromPrice.amountPaisa, lang) })
          : undefined,
      },
    ];
  });
  const lead = ordered[0];
  const l = dict.landing;

  return (
    <section className="hero-wall-root relative isolate overflow-hidden bg-[linear-gradient(180deg,var(--color-paper)_0%,var(--color-sand)_100%)]">
      <style>{HERO_CSS}</style>
      <Container className="grid items-center gap-x-16 gap-y-8 pb-20 pt-8 sm:pb-24 lg:gap-y-6 lg:h-[calc(100svh-11.5rem)] lg:max-h-[52rem] lg:min-h-[36rem] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:grid-rows-[1fr_auto] lg:pb-12 lg:pt-6">
        <div className="order-2 max-w-xl space-y-6 lg:order-1 lg:col-start-1 lg:row-start-1 lg:self-end">
          <Eyebrow className="hero-rise text-walnut" style={rise(0)}>
            {l.heroEyebrow}
          </Eyebrow>
          <Heading
            as="h1"
            level="h1"
            className="hero-rise text-ink lg:text-[clamp(3.4rem,1.2rem+3.6vw,5.4rem)]"
            style={rise(1)}
          >
            {dict.home.heroHeading}
          </Heading>
          <p
            className="hero-rise max-w-md text-base leading-relaxed text-ink/85 sm:text-lg"
            style={rise(2)}
          >
            {dict.home.heroSubline}
          </p>
          <div
            className="hero-rise flex flex-wrap items-center gap-x-8 gap-y-4 pt-1"
            style={rise(3)}
          >
            <ButtonLink
              href={href(lang, lead ? `/products/${lead.slug}` : '/shop')}
              size="lg"
              className="group gap-3"
            >
              {dict.home.cta}
              <ArrowRight
                aria-hidden
                className="size-4 transition-transform duration-500 ease-out-soft group-hover:translate-x-1"
              />
            </ButtonLink>
            <ButtonLink href="#craft" variant="link">
              {l.heroSecondary}
            </ButtonLink>
          </div>
        </div>
        {pieces.length ? <HeroWall pieces={pieces} labels={l.heroWall} /> : null}
      </Container>
      <p className="absolute bottom-3 right-4 text-[0.6rem] text-ink/70">{l.sampleNote}</p>
    </section>
  );
}
