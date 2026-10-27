import { Fragment } from 'react';
import { ArrowRight } from 'lucide-react';
import { productName } from '@/features/catalog/product-copy';
import { HERO_SCENES } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatTaka } from '@/i18n/format';
import { type HomeContent } from '@/shared/api/content';
import { type ProductSummary } from '@/shared/api/types';
import { href } from '@/shared/lib/site';
import { ButtonLink } from '@/shared/ui/button';
import { Container, Eyebrow } from '@/shared/ui/typography';
import { HeroScenes, type Scene } from './hero-scenes.client';

/* A cinematic frame: film grain, vignette, a slow beam of window light, a bloom on the lit piece
   and a soft letterbox. Golden hour by day; dimmed, lamp-lit by night. Scenes change with a
   focus pull; the words fade in from a soft blur. Motion only when it is welcome. */
const HERO_CSS = `
/* One face for the whole hero (Latin): the logo's Cormorant Garamond. Bangla keeps its fonts. */
html[lang='en'] .hero-root, html[lang='en'] .hero-root * { font-family: var(--font-cormorant-wordmark), Georgia, serif; }
html[lang='en'] .hero-root em { font-family: var(--font-cormorant-italic), var(--font-cormorant-wordmark), Georgia, serif; }

.scene { transition: opacity 1.4s cubic-bezier(.4,0,.2,1), filter 1.4s cubic-bezier(.4,0,.2,1); }
.scene-off { opacity: 0; filter: blur(6px); }
.scene-on { opacity: 1; filter: none; }
.cine { animation: cine-in 1.6s ease-out both; }
@keyframes cine-in { from { opacity: 0; } to { opacity: 1; } }
:root[data-theme='dark'] .hero-root .scene-drift { filter: brightness(.72) saturate(1.05) contrast(1.06); }

.cine-grade { background: linear-gradient(115deg, rgba(255,196,120,.22), rgba(255,170,90,.08) 45%, rgba(120,70,30,.18)); mix-blend-mode: soft-light; }
:root[data-theme='dark'] .hero-root .cine-grade { background: linear-gradient(115deg, rgba(30,20,40,.35), rgba(20,14,10,.2) 50%, rgba(10,8,6,.4)); mix-blend-mode: multiply; }
.cine-vignette { background: radial-gradient(120% 95% at 62% 45%, transparent 55%, rgba(43,30,25,.55) 100%); }
:root[data-theme='dark'] .hero-root .cine-vignette { background: radial-gradient(110% 90% at 72% 42%, transparent 40%, rgba(13,11,9,.8) 100%); }
.cine-beam {
  background: linear-gradient(115deg, transparent 18%, rgba(255,214,160,.28) 30%, rgba(255,214,160,.08) 40%, transparent 52%);
  mix-blend-mode: screen; opacity: .85; transform-origin: 0 0;
}
:root[data-theme='dark'] .hero-root .cine-beam { opacity: .22; }
.cine-bloom {
  left: 76%; top: 38%; width: 46vmin; height: 46vmin; transform: translate(-50%, -50%);
  background: radial-gradient(closest-side, rgba(255,200,130,.32), rgba(255,170,90,.08) 60%, transparent);
  mix-blend-mode: screen; opacity: .55;
}
:root[data-theme='dark'] .hero-root .cine-bloom { opacity: 1; }
.cine-grain {
  inset: -50%;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
  opacity: .07; mix-blend-mode: overlay;
}
.cine-bar { height: 2.2%; background: rgba(13,11,9,.5); }
@media (max-width: 1023px) { .cine-bloom { left: 75%; top: 26%; width: 70vmin; height: 70vmin; } }

@media (prefers-reduced-motion: no-preference) {
  .hero-rise { opacity: 0; animation: hero-rise 1.3s cubic-bezier(.22,1,.36,1) forwards; }
  .scene-on .scene-drift { animation: scene-drift 10s ease-out both; }
  .scene-caption { animation: hero-rise .9s cubic-bezier(.22,1,.36,1); }
  .scene-progress { animation-name: scene-progress; animation-timing-function: linear; animation-fill-mode: both; }
  .cine-beam { animation: cine-beam 14s ease-in-out infinite alternate; }
  .cine-bloom { animation: cine-bloom 6s ease-in-out infinite alternate; }
  .cine-grain { animation: cine-grain 1s steps(6) infinite; }
  .cine-bar { animation: cine-bar 1.6s .2s cubic-bezier(.22,1,.36,1) both; }
}
@media (prefers-reduced-motion: reduce) { .scene { transition: none; } }
@keyframes hero-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@media (min-width: 1024px) { .hero-rise { animation-name: hero-rise-soft; } }
@keyframes hero-rise-soft { from { opacity: 0; transform: translateY(14px); filter: blur(8px); } to { opacity: 1; transform: none; filter: none; } }
@keyframes scene-drift { from { transform: scale(1.04); } to { transform: scale(1.1); } }
@keyframes scene-progress { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes cine-beam { from { transform: translateX(-4%) skewX(-2deg); opacity: .55; } to { transform: translateX(5%) skewX(2deg); } }
@keyframes cine-bloom { from { transform: translate(-50%, -50%) scale(.92); } to { transform: translate(-50%, -50%) scale(1.06); } }
@keyframes cine-grain { 0% { transform: translate(0,0); } 20% { transform: translate(-3%,2%); } 40% { transform: translate(2%,-3%); } 60% { transform: translate(-2%,-1%); } 80% { transform: translate(3%,1%); } 100% { transform: translate(0,2%); } }
@keyframes cine-bar { from { transform: scaleY(0); } to { transform: scaleY(1); } }

/* Words rise out of their own line, one after another (masked, so nothing jumps). Extra room
   above and below keeps Bangla vowel signs and italic overhangs from being clipped. */
.hero-root .word { display: inline-block; overflow: hidden; vertical-align: top; padding: .06em .08em .14em 0; margin: -.06em -.08em -.14em 0; }
html[lang='bn'] .hero-root .word { padding-block: .22em .3em; margin-block: -.22em -.3em; }
.hero-root .word > span { display: inline-block; }
@media (prefers-reduced-motion: no-preference) {
  .hero-root .word > span { animation: word-up 1.1s cubic-bezier(.22,1,.36,1) both; animation-delay: calc(.2s + var(--w) * 60ms); }
}
@keyframes word-up { from { transform: translateY(110%); } }
`;

const rise = (step: number) => ({ animationDelay: `${120 + step * 110}ms` });

/** Each word in its own mask for the rise; `from` continues the stagger across parts. */
function words(text: string, from: number) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((w, i) => (
      <Fragment key={i}>
        {i ? ' ' : null}
        <span className="word">
          <span style={{ '--w': from + i } as React.CSSProperties}>{w}</span>
        </span>
      </Fragment>
    ));
}

/**
 * Cinematic hero: full-bleed room scenes, each with one of our pieces lit on the wall, the words
 * over a warm shade on the left. Names and prices come from the catalog.
 */
export function Hero({
  lang,
  dict,
  products,
  featuredSlug,
  content,
}: {
  lang: Locale;
  dict: Dictionary;
  products: ProductSummary[];
  featuredSlug?: string;
  /** The owner's scenes from the dashboard; the built-in scenes until then. */
  content?: HomeContent | null;
}) {
  const l = dict.landing;
  // Owner's scenes: an uploaded photo, else the built-in scene of that piece (or any).
  const source = content?.hero.scenes.length
    ? content.hero.scenes.map((s, i) => ({
        src:
          s.imageUrl ??
          HERO_SCENES.find((h) => h.productSlug === s.productSlug)?.src ??
          HERO_SCENES[i % HERO_SCENES.length]!.src,
        productSlug: s.productSlug,
        position: s.position,
        phonePosition: s.phonePosition,
      }))
    : HERO_SCENES;
  const scenes: Scene[] = source.flatMap((s) => {
    const product = products.find((p) => p.slug === s.productSlug);
    if (!product) return [];
    return [
      {
        src: s.src,
        position: s.position,
        phonePosition: s.phonePosition,
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
          <div className="max-w-[40rem] space-y-6">
            <Eyebrow
              className="hero-rise text-[0.8rem] font-semibold tracking-[0.3em] text-ivory/90"
              style={rise(0)}
            >
              {l.heroEyebrow}
            </Eyebrow>
            <h1 className="max-w-[22ch] font-display text-[clamp(2.4rem,1.4rem+2.6vw,3.9rem)] font-medium leading-[1.08] tracking-[-0.01em] text-balance [:lang(bn)_&]:text-[clamp(2.1rem,1.4rem+2.2vw,3.4rem)] [:lang(bn)_&]:leading-[1.25] [:lang(bn)_&]:tracking-normal">
              {words(dict.home.heroHeading, 0)}{' '}
              <em className="text-glow [:lang(bn)_&]:not-italic">
                {words(dict.home.heroHeadingAccent, dict.home.heroHeading.split(/\s+/).length)}
              </em>
            </h1>
            <p
              className="hero-rise max-w-md text-[1.2rem] font-medium leading-relaxed text-ivory/90 sm:text-[1.35rem]"
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
                className="group gap-3 text-[0.85rem] font-semibold tracking-[0.16em]"
              >
                {dict.home.explore}
                <ArrowRight
                  aria-hidden
                  className="size-4 transition-transform duration-500 ease-out-soft group-hover:translate-x-1"
                />
              </ButtonLink>
              {lead ? (
                <ButtonLink
                  href={href(lang, `/products/${lead.slug}`)}
                  variant="linkLight"
                  className="text-[0.85rem] font-semibold tracking-[0.16em]"
                >
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
