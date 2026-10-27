import { productName } from '@/features/catalog/product-copy';
import { HERO_SCENES, SAMPLE } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { type HomeContent } from '@/shared/api/content';
import { type ProductSummary } from '@/shared/api/types';
import { href } from '@/shared/lib/site';
import { HeroSlides, type Slide } from './hero-slides.client';

/* Slides cross-fade; on each arrival the letters rise out of their lines one after another, the
   photo settles from a slight zoom and the rest fades up. Motion only when it is welcome. */
const HERO_CSS = `
.hero-slides .slide { transition: opacity .9s cubic-bezier(.4,0,.2,1), visibility .9s; }
.hero-slides .slide-off { opacity: 0; visibility: hidden; }
.hero-slides .slide-on { opacity: 1; visibility: visible; }
.hero-slides .rise-word { display: inline-block; overflow: hidden; vertical-align: top; white-space: nowrap;
  padding: .1em .05em .16em 0; margin: -.1em -.05em -.16em 0; }
html[lang='bn'] .hero-slides .rise-word { padding-block: .25em .32em; margin-block: -.25em -.32em; }
.hero-slides .rise-ch { display: inline-block; }
@media (prefers-reduced-motion: no-preference) {
  .slide-on .rise-ch { animation: hero-ch 1.1s cubic-bezier(.16,1,.3,1) both; animation-delay: calc(.12s + var(--i) * 38ms); }
  .slide-on .slide-early { animation: hero-fade .9s .1s cubic-bezier(.16,1,.3,1) both; }
  .slide-on .slide-fade { animation: hero-fade 1s .6s cubic-bezier(.16,1,.3,1) both; }
  /* Slide 1 follows the owner's reference: the words first, then the photo opens out from a
     small frame in the centre, then the cards rise and the side line arrives. */
  .slide-on .slide-reveal { animation: hero-reveal 1.3s .9s cubic-bezier(.65,0,.15,1) both; }
  .slide-on .slide-reveal ~ .slide-fade, .slide-on .slide-fade:has(~ .slide-reveal) { animation-delay: 2s; }
  .slide-on .slide-card { animation: hero-fade 1s calc(1.7s + var(--i) * 150ms) cubic-bezier(.16,1,.3,1) both; }
  .slide-on .slide-zoom { animation: hero-zoom 8s cubic-bezier(.16,1,.3,1) both; }
  /* The loader comes first, the photo opens out behind it, then the loader goes. */
  .slide-on .slide-spin { animation: hero-spin .5s cubic-bezier(.16,1,.3,1) both, hero-spin-out .6s 2.2s ease-in forwards; }
  .slide-progress { animation-name: hero-progress; animation-timing-function: linear; animation-fill-mode: both; }
}
@keyframes hero-ch { from { transform: translateY(108%) rotate(3deg); } }
@keyframes hero-fade { from { opacity: 0; transform: translateY(18px); } }
@keyframes hero-zoom { from { transform: scale(1.08); } }
.hero-slides .spark-spoke { opacity: .35; }
@media (prefers-reduced-motion: no-preference) {
  .hero-slides .spark-spoke { animation: spark 1.2s linear infinite; animation-delay: calc(var(--s) * 150ms - 1.2s); }
}
@keyframes spark { 0% { opacity: 1; } 100% { opacity: .2; } }
@keyframes hero-reveal { 0% { clip-path: inset(50% 50% 50% 50%); } 25% { clip-path: inset(40% 32% 40% 32%); } 100% { clip-path: inset(0); } }
@keyframes hero-spin { from { opacity: 0; transform: scale(.6); } }
@keyframes hero-spin-out { to { opacity: 0; transform: scale(.6); visibility: hidden; } }
@keyframes hero-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
`;

/**
 * The home hero (four slides): our wall pieces, then interior design, construction and bulk
 * orders. Slide 1 uses the owner's hero scenes from the dashboard (the first as the tall photo,
 * the next two as cards); names and prices come from the catalog.
 */
export function Hero({
  lang,
  dict,
  products,
  content,
}: {
  lang: Locale;
  dict: Dictionary;
  products: ProductSummary[];
  featuredSlug?: string;
  /** The owner's scenes from the dashboard; the built-in scenes until then. */
  content?: HomeContent | null;
}) {
  const h = dict.heroSlides;
  const source = content?.hero.scenes.length
    ? content.hero.scenes.map((s, i) => ({
        src:
          s.imageUrl ??
          HERO_SCENES.find((x) => x.productSlug === s.productSlug)?.src ??
          HERO_SCENES[i % HERO_SCENES.length]!.src,
        productSlug: s.productSlug,
        position: s.position,
        phonePosition: s.phonePosition,
      }))
    : HERO_SCENES;
  const pieces = source.flatMap((s) => {
    const product = products.find((p) => p.slug === s.productSlug);
    return product
      ? [
          {
            src: s.src,
            position: s.position,
            phonePosition: s.phonePosition,
            caption: productName(product, lang, dict),
            href: href(lang, `/products/${product.slug}`),
          },
        ]
      : [];
  });
  const [main, ...cards] = pieces;

  const slides: Slide[] = [
    ...(main
      ? [
          {
            kind: 'panels' as const,
            name: dict.landing.heroEyebrow,
            left: h.panels.left,
            right: h.panels.right,
            top: dict.home.heroSubline,
            side: h.panels.side,
            main,
            cards: cards.slice(0, 2),
            primary: { label: dict.home.explore, href: href(lang, '/shop') },
          },
        ]
      : []),
    {
      kind: 'full',
      name: dict.services.design.title,
      title: h.design.title,
      text: dict.design.lead,
      photo: { src: SAMPLE.woodLounge.src, position: '50% 55%', phonePosition: '45% 50%' },
      primary: { label: dict.design.button, href: href(lang, '/design#consult') },
      secondary: { label: h.work, href: href(lang, '/design') },
    },
    {
      kind: 'full',
      name: dict.services.construction.title,
      title: h.construction.title,
      text: dict.construction.lead,
      photo: { src: SAMPLE.duskHouse.src, position: '50% 55%', phonePosition: '45% 50%' },
      primary: { label: dict.construction.button, href: href(lang, '/construction#start') },
      secondary: { label: h.work, href: href(lang, '/construction') },
    },
    {
      kind: 'full',
      name: dict.services.bulk.title,
      title: h.bulk.title,
      text: dict.bulk.text,
      photo: { src: SAMPLE.woodReception.src, position: '50% 50%', phonePosition: '60% 50%' },
      primary: { label: h.bulk.cta, href: href(lang, '/bulk') },
    },
  ];

  return (
    <section className="hero-root tone-dark">
      <style>{HERO_CSS}</style>
      <HeroSlides
        slides={slides}
        lang={lang}
        labels={{
          previous: dict.landing.heroWall.previous,
          next: dict.landing.heroWall.next,
          pause: dict.landing.heroWall.pause,
          play: dict.landing.heroWall.play,
          show: dict.landing.heroWall.show,
        }}
      >
        <h1 className="sr-only">
          {dict.home.heroHeading} {dict.home.heroHeadingAccent}
        </h1>
      </HeroSlides>
    </section>
  );
}
