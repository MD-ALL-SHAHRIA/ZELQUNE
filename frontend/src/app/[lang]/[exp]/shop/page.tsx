import type { Metadata } from 'next';
import { CollectionPage } from '@/features/catalog/collection-page';
import { listProducts } from '@/shared/api/server';
import { resolvePage, type PageParams } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';

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
    <CollectionPage
      eyebrow={dict.nav.shop}
      title={dict.shop.title}
      products={await listProducts(segment)}
      lang={lang}
      dict={dict}
    />
  );
}
