import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { listingProducts, orderCategories } from '@/features/catalog/listing-data';
import { ListingPage } from '@/features/catalog/listing-page';
import { listCategories } from '@/shared/api/server';
import { resolvePage } from '@/shared/lib/page-params';
import { alternates } from '@/shared/lib/site';

export const revalidate = 60;

// ISR: paths are rendered on first request, then cached (an empty list enables runtime ISR).
export function generateStaticParams() {
  return [];
}

type Params = Promise<{ lang: string; exp: string; slug: string }>;

async function load(params: Params) {
  const page = await resolvePage(params);
  const { slug } = await params;
  const categories = orderCategories(await listCategories());
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();
  return {
    ...page,
    categories,
    category,
    name: page.lang === 'bn' ? category.nameBn : category.nameEn,
  };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, dict, category, name } = await load(params);
  return {
    title: `${name} · ${dict.brand.name}`,
    description: dict.brand.seoDescription,
    alternates: alternates(lang, `/category/${category.slug}`),
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const { lang, segment, dict, categories, category } = await load(params);
  return (
    <ListingPage
      lang={lang}
      dict={dict}
      categories={categories}
      active={category}
      products={await listingProducts(segment, category.slug)}
    />
  );
}
