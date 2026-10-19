import type { Metadata } from 'next';
import { ValuesBand } from '@/features/layout/footer';
import { CategoryTiles } from '@/features/landing/category-tiles';
import { Craft } from '@/features/landing/craft';
import { DayNight } from '@/features/landing/day-night';
import { FaqPreview } from '@/features/landing/faq-preview';
import { FeaturedProduct } from '@/features/landing/featured-product';
import { Hero } from '@/features/landing/hero';
import { ProductRail } from '@/features/landing/product-rail';
import { Services } from '@/features/landing/services';
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
 * Home: every section has its own composition, so the page reads as a sequence rather than a
 * repeated image-and-text split. Hero (full bleed) → values strip → featured piece (asymmetric
 * arch spread) → categories (staggered tall cards) → day/night (edge-to-edge split) → the making
 * (full-bleed photo, overlapping card, horizontal steps) → collection rail → services (dark
 * bento) → FAQ.
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
      <ValuesBand dict={dict} />
      {featured ? <FeaturedProduct product={featured} lang={lang} dict={dict} /> : null}
      <CategoryTiles lang={lang} dict={dict} categories={categories} />
      <DayNight dict={dict} />
      <Craft dict={dict} lang={lang} />
      {products.length > 1 ? <ProductRail products={products} lang={lang} dict={dict} /> : null}
      <Services lang={lang} dict={dict} />
      <FaqPreview lang={lang} dict={dict} />
    </>
  );
}
