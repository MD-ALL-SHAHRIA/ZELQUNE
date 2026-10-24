import type { Metadata } from 'next';
import { CollectionsRow } from '@/features/landing/collections-row';
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
import { TrustStrip } from '@/features/trust/trust-strip';
import { listCategories, listProducts } from '@/shared/api/server';
import { getHomeContent, withContent } from '@/shared/api/content';
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
  const { lang, segment, dict: base } = await resolvePage(params);
  const [products, categories, content] = await Promise.all([
    listProducts(segment),
    listCategories(),
    getHomeContent(),
  ]);
  // The owner's words from the dashboard over the built-in copy (empty fields keep the copy).
  const dict = withContent(base, content, lang);
  // Collections: the owner's choice and order when set, else the catalog's; each with its
  // number of pieces (empty ones are left out).
  const chosen = content?.collections.length
    ? content.collections.flatMap((c) => {
        const category = categories.find((x) => x.slug === c.categorySlug);
        return category ? [{ category, imageUrl: c.imageUrl }] : [];
      })
    : categories.map((category) => ({ category, imageUrl: null }));
  const collections = (
    await Promise.all(
      chosen.map(async (c) => ({
        ...c,
        count: (await listProducts(segment, c.category.slug)).length,
      })),
    )
  ).filter((c) => c.count > 0);
  // The pre-order test product leads the page while it exists (owner's GO test).
  const featured = products.find((p) => p.slug === FEATURED_SLUG) ?? products[0];
  return (
    <>
      <Hero
        lang={lang}
        dict={dict}
        products={products}
        featuredSlug={featured?.slug}
        content={content}
      />
      <TrustStrip dict={dict} icons={content?.trust.map((t) => t.icon)} />
      <CollectionsRow lang={lang} dict={dict} collections={collections} />
      {featured ? <FeaturedProduct product={featured} lang={lang} dict={dict} /> : null}
      <ShopTheRoom products={products} lang={lang} dict={dict} />
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
