import type { Metadata } from 'next';
import { listingProducts, orderCategories } from '@/features/catalog/listing-data';
import { ListingPage } from '@/features/catalog/listing-page';
import { listCategories } from '@/shared/api/server';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.shop.title} · ${dict.brand.name}`,
    description: dict.brand.seoDescription,
    alternates: alternates(lang, '/shop'),
  };
}

export default async function Shop({ params }: { params: PageParams }) {
  const { lang, segment, dict } = await resolvePage(params);
  const [categories, products] = await Promise.all([listCategories(), listingProducts(segment)]);
  return (
    <ListingPage
      lang={lang}
      dict={dict}
      categories={orderCategories(categories)}
      active={null}
      products={products}
    />
  );
}
