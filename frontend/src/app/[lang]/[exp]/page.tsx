import type { Metadata } from 'next';
import Link from 'next/link';
import { Photo } from '@/components/photo';
import { ProductCard } from '@/components/product-card';
import { formatTaka } from '@/i18n/format';
import { listProducts } from '@/lib/api-server';
import { resolvePage, type PageParams } from '@/lib/page-params';
import { alternates, href } from '@/lib/site';

export const revalidate = 300;

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
  const products = await listProducts(segment);
  const featured = products[0];
  return (
    <div className="space-y-12">
      <section className="grid items-center gap-6 sm:grid-cols-2">
        <Photo
          src={featured?.primaryMedia?.url}
          alt={dict.home.heroHeading}
          placeholder={dict.ui.photoPlaceholder}
          sizes="(min-width: 640px) 50vw, 92vw"
          priority
        />
        <div className="space-y-4">
          <h1 className="text-3xl font-semibold leading-tight text-walnut sm:text-4xl">
            {dict.home.heroHeading}
          </h1>
          <p className="text-lg">{dict.home.heroSubline}</p>
          {featured?.fromPrice ? (
            <p className="text-2xl font-semibold">
              {formatTaka(featured.fromPrice.amountPaisa, lang)}
            </p>
          ) : null}
          {featured ? (
            <Link
              href={href(lang, `/products/${featured.slug}`)}
              className="inline-block rounded-md bg-walnut px-6 py-3 font-semibold text-cream hover:bg-ink"
            >
              {dict.home.cta}
            </Link>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {dict.home.benefits.map((b) => (
          <div key={b.title} className="rounded-lg bg-surface p-4 ring-1 ring-line">
            <h2 className="font-semibold text-walnut">{b.title}</h2>
            <p className="mt-1 text-sm">{b.text}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-walnut">{dict.shop.title}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} lang={lang} dict={dict} />
          ))}
        </div>
      </section>

      <section className="rounded-lg bg-walnut p-6 text-cream">
        <p className="text-lg">{dict.home.bulkBanner}</p>
        <Link
          href={href(lang, '/bulk')}
          className="mt-3 inline-block rounded-md bg-amber px-5 py-2.5 font-semibold text-ink"
        >
          {dict.home.bulkBannerCta}
        </Link>
      </section>
    </div>
  );
}
