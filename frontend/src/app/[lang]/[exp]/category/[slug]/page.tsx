import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CollectionPage } from '@/features/catalog/collection-page';
import { listCategories, listProducts } from '@/shared/api/server';
import { resolvePage } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';

export const revalidate = 300;

// ISR: paths are rendered on first request, then cached (an empty list enables runtime ISR).
export function generateStaticParams() {
  return [];
}

type Params = Promise<{ lang: string; exp: string; slug: string }>;

async function load(params: Params) {
  const page = await resolvePage(params);
  const { slug } = await params;
  const category = (await listCategories()).find((c) => c.slug === slug);
  if (!category) notFound();
  return { ...page, category, name: page.lang === 'bn' ? category.nameBn : category.nameEn };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, dict, category, name } = await load(params);
  return {
    title: `${name} · ${dict.brand.name}`,
    alternates: alternates(lang, `/category/${category.slug}`),
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { lang, segment, dict, category, name } = await load(params);
  return (
    <CollectionPage
      eyebrow={dict.nav.shop}
      title={name}
      products={await listProducts(segment, category.slug)}
      lang={lang}
      dict={dict}
    />
  );
}
