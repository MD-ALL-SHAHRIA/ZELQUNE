import type { Metadata } from 'next';
import { ProductCard } from '@/features/catalog/product-card';
import { ValuesBand } from '@/features/layout/footer';
import { BusinessBand } from '@/features/landing/business-band';
import { CategoryTiles } from '@/features/landing/category-tiles';
import { DesignBand } from '@/features/landing/design-band';
import { Craft } from '@/features/landing/craft';
import { DayNight } from '@/features/landing/day-night';
import { FaqPreview } from '@/features/landing/faq-preview';
import { FeaturedProduct } from '@/features/landing/featured-product';
import { Hero } from '@/features/landing/hero';
import { listCategories, listProducts } from '@/shared/api/server';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';

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
      <CategoryTiles lang={lang} dict={dict} categories={categories} />
      {featured ? <FeaturedProduct product={featured} lang={lang} dict={dict} /> : null}
      <DesignBand lang={lang} dict={dict} />
      <Craft dict={dict} lang={lang} />
      <DayNight dict={dict} />
      {products.length > 1 ? (
        <section className="py-24 sm:py-32">
          <Container>
            <div className="reveal mb-12 space-y-5">
              <Eyebrow>{dict.nav.shop}</Eyebrow>
              <Heading>{dict.shop.title}</Heading>
            </div>
            <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <div key={p.id} className="reveal">
                  <ProductCard product={p} lang={lang} dict={dict} />
                </div>
              ))}
            </div>
          </Container>
        </section>
      ) : null}
      <BusinessBand lang={lang} dict={dict} />
      <FaqPreview lang={lang} dict={dict} />
    </>
  );
}
