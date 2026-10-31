import type { MetadataRoute } from 'next';
import { SECTORS } from '@/features/design/sectors';
import { LOCALES } from '@/i18n/config';
import { listCategories, listProducts } from '@/shared/api/server';
import { href, SITE_URL } from '@/shared/lib/site';

export const revalidate = 3600;

const PAGES = [
  '',
  '/shop',
  '/design',
  ...SECTORS.map((s) => `/design/${s.slug}`),
  '/construction',
  '/bulk',
  '/story',
  '/faq',
  '/terms',
  '/returns',
  '/privacy',
  '/cookies',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The sitemap must not break the build or the site when the catalog is unreachable.
  const [products, categories] = await Promise.all([
    listProducts('base').catch(() => []),
    listCategories().catch(() => []),
  ]);
  const paths = [
    ...PAGES,
    ...categories.map((c) => `/category/${c.slug}`),
    ...products.map((p) => `/products/${p.slug}`),
  ];
  return paths.map((path) => ({
    url: `${SITE_URL}${href('en', path)}`,
    alternates: {
      languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}${href(l, path)}`])),
    },
  }));
}
