import type { Metadata } from 'next';
import { CategoryTiles } from '@/features/landing/category-tiles';
import { Craft } from '@/features/landing/craft';
import { DayNight } from '@/features/landing/day-night';
import { FaqPreview } from '@/features/landing/faq-preview';
import { FeaturedProduct } from '@/features/landing/featured-product';
import { Hero } from '@/features/landing/hero';
import { Materials } from '@/features/landing/materials';
import { ProductRail } from '@/features/landing/product-rail';
import { Services } from '@/features/landing/services';
import { ShopTheRoom } from '@/features/landing/shop-the-room';
import { Statement } from '@/features/landing/statement';
import { TrustBand } from '@/features/trust/trust-band';
import { listCategories, listProducts } from '@/shared/api/server';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';

export const revalidate = 300;

const FEATURED_SLUG = 'alo-arch-panel';

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.brand.name} · ${dict.brand.tagline}`,
    description: dict.brand.seoDescription,
    alternates: alternates(lang),
  };
}

/**
 * Home, paced like an editorial: no two neighbouring sections share a composition.
 * Hero (full-bleed crossfade, ink) → featured piece (arch spread, glow) → shop the room (photo
 * with markers, cream) → categories (staggered tall cards) → day/night (edge-to-edge split) →
 * materials (centred specimen sheet) → the making (full-bleed photo, overlapping card, steps) →
 * collection rail (bleeding scroller) → statement (one large sentence) → services (dark bento)
 * → buy with confidence (trust band) → FAQ (sticky heading, accordion).
 */
export default async function Home({ params }: { params: PageParams }) {
  const { lang, segment, dict } = await resolvePage(params);
  const [products, categories] = await Promise.all([listProducts(segment), listCategories()]);
  // The pre-order test product leads the page while it exists (owner's GO test).
  const featured = products.find((p) => p.slug === FEATURED_SLUG) ?? products[0];
  return (
    <>
      <Hero
        lang={lang}
        dict={dict}
        productSlug={featured?.slug}
        pricePaisa={featured?.fromPrice?.amountPaisa}
      />
      {featured ? <FeaturedProduct product={featured} lang={lang} dict={dict} /> : null}
      <ShopTheRoom products={products} lang={lang} dict={dict} />
      <CategoryTiles lang={lang} dict={dict} categories={categories} />
      <DayNight dict={dict} />
      <Materials dict={dict} lang={lang} />
      <Craft dict={dict} lang={lang} />
      {products.length > 1 ? <ProductRail products={products} lang={lang} dict={dict} /> : null}
      <Statement dict={dict} />
      <Services lang={lang} dict={dict} />
      <TrustBand dict={dict} />
      <FaqPreview lang={lang} dict={dict} />
    </>
  );
}
