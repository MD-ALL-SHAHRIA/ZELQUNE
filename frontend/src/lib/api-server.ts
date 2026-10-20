import 'server-only';
import { createApiClient } from '@zelqune/api-client';
import { ApiError, type Category, type District, ok, type ProductDetail } from './api-types';
import { isExperimentKey, type PriceSegment } from './visitor';

/** Catalog pages are ISR: data is refetched at most every 5 minutes. */
export const REVALIDATE_SECONDS = 300;

const api = createApiClient(
  process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  { fetch: (request) => fetch(request, { next: { revalidate: REVALIDATE_SECONDS } }) },
);

const priceQuery = (segment: PriceSegment) => (isExperimentKey(segment) ? { p: segment } : {});

export async function getProduct(slug: string, segment: PriceSegment) {
  try {
    return ok(
      await api.GET('/v1/catalog/products/{slug}', {
        params: { path: { slug }, query: priceQuery(segment) },
      }),
    ) satisfies ProductDetail;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function listProducts(segment: PriceSegment, category?: string) {
  const page = ok(
    await api.GET('/v1/catalog/products', {
      params: { query: { ...priceQuery(segment), ...(category ? { category } : {}), limit: 50 } },
    }),
  );
  return page.items;
}

export async function listCategories(): Promise<Category[]> {
  return ok(await api.GET('/v1/catalog/categories')).items;
}

export async function listDistricts(): Promise<District[]> {
  return ok(await api.GET('/v1/shipping/districts')).items;
}
