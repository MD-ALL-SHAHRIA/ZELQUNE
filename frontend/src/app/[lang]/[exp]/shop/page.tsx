import type { Metadata } from 'next';
import { ProductGridPage } from '@/components/product-grid-page';
import { listProducts } from '@/lib/api-server';
import { resolvePage, type PageParams } from '@/lib/page-params';
import { alternates } from '@/lib/site';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: PageParams }): Promise<Metadata> {
  const { lang, dict } = await resolvePage(params);
  return {
    title: `${dict.shop.title} · ${dict.brand.name}`,
    alternates: alternates(lang, '/shop'),
  };
}

export default async function Shop({ params }: { params: PageParams }) {
  const { lang, segment, dict } = await resolvePage(params);
  return (
    <ProductGridPage
      title={dict.shop.title}
      products={await listProducts(segment)}
      lang={lang}
      dict={dict}
    />
  );
}
