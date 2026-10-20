import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductGridPage } from '@/components/product-grid-page';
import { listCategories, listProducts } from '@/lib/api-server';
import { resolvePage } from '@/lib/page-params';
import { alternates } from '@/lib/site';

export const revalidate = 300;

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
    <ProductGridPage
      title={name}
      products={await listProducts(segment, category.slug)}
      lang={lang}
      dict={dict}
    />
  );
}
