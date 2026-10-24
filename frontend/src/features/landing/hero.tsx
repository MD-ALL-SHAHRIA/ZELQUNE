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

/* The wall: limewash plaster (an inline SVG noise, no download), raking light from the top left,
   a ceiling shade and a skirting line. Its tone glides to each piece's own wall. Pieces are hung
   (rise, settle, glow); the words rise in one after another. Motion only when it is welcome. */
const WALL_CSS = `
.hero-wall-root { --wall-base: color-mix(in oklab, var(--color-paper) 55%, var(--color-sand)); }
:root[data-theme='dark'] .hero-wall-root { --wall-base: #2a211c; }
.wall-plaster {
  background-color: var(--wall-base);
  background-image:
    radial-gradient(120% 90% at 8% 0%, color-mix(in oklab, white 22%, transparent), transparent 60%),
    linear-gradient(180deg, color-mix(in oklab, black 10%, transparent), transparent 14%),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .35 0 0 0 0 .27 0 0 0 0 .2 0 0 0 .09 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}
.wall-tint {
  background-color: var(--piece-wall);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 45%);
  mask-image: linear-gradient(90deg, transparent, #000 45%);
  transition: background-color 1.1s cubic-bezier(.22,1,.36,1);
}
:root[data-theme='dark'] .wall-tint { opacity: .32; }
@media (max-width: 1023px) {
  .wall-tint {
    -webkit-mask-image: linear-gradient(180deg, #000 55%, transparent);
    mask-image: linear-gradient(180deg, #000 55%, transparent);
  }
}
.wall-feather {
  -webkit-mask-image: radial-gradient(ellipse 50% 50% at 50% 48%, #000 70%, transparent 100%);
  mask-image: radial-gradient(ellipse 50% 50% at 50% 48%, #000 70%, transparent 100%);
}
:root[data-theme='dark'] .wall-feather { filter: brightness(.86); }
.wall-piece-off { opacity: 0; pointer-events: none; }
.wall-piece-on { opacity: 1; }
@media (prefers-reduced-motion: no-preference) {
  .hero-rise { opacity: 0; animation: hero-rise 1.1s cubic-bezier(.22,1,.36,1) forwards; }
  .wall-piece { transition: opacity 1s cubic-bezier(.22,1,.36,1), transform 1.4s cubic-bezier(.22,1,.36,1); }
  .wall-piece-off { transform: translateY(10px) scale(.985); }
  .wall-piece-on { transform: none; }
  .wall-piece-on .wall-feather { animation: wall-hang 1.6s cubic-bezier(.22,1,.36,1); }
  .wall-glow { animation: wall-glow-in 1.6s ease-out, wall-breathe 6s 1.6s ease-in-out infinite alternate; }
  .wall-caption { animation: hero-rise .9s cubic-bezier(.22,1,.36,1); }
  .wall-progress { animation-name: wall-progress; animation-timing-function: linear; animation-fill-mode: both; }
}
@keyframes hero-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
@keyframes wall-hang { from { transform: translateY(-14px) scale(1.03); } to { transform: none; } }
@keyframes wall-glow-in { from { opacity: .2; transform: scale(.85); } to { opacity: 1; transform: none; } }
@keyframes wall-breathe { from { opacity: .75; transform: scale(.97); } to { opacity: 1; transform: scale(1.03); } }
@keyframes wall-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
`;

const rise = (step: number) => ({ animationDelay: `${120 + step * 110}ms` });

const MAX_PIECES = 6;

/**
 * "The Wall": a full-bleed plaster wall where every piece is hung in turn, the words on the
 * left. Real catalog photos replace the sample renders automatically (productImages).
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
        wall: image.wall,
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
    <section className="hero-wall-root wall-plaster relative isolate overflow-hidden">
      <style>{WALL_CSS}</style>
      {/* Skirting: where the wall meets the floor. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-10 border-t border-ink/10 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-ink)_7%,transparent),transparent)]"
      />
      <Container className="grid items-center gap-x-16 gap-y-8 pb-20 pt-8 sm:pb-24 lg:gap-y-6 lg:h-[calc(100svh-11.5rem)] lg:max-h-[52rem] lg:min-h-[36rem] lg:grid-cols-[1fr_1fr] lg:grid-rows-[1fr_auto] lg:pb-12 lg:pt-6">
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
