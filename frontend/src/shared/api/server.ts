import 'server-only';
import { createApiClient } from '@zelqune/api-client';
import {
  type ActiveSale,
  ApiError,
  type Category,
  type District,
  ok,
  type ProductDetail,
} from '@/shared/api/types';
import { isExperimentKey, type PriceSegment } from '@/shared/lib/visitor';

/**
 * Catalog pages are ISR: data is refetched at most every minute, so a sale or a price change
 * from the dashboard shows within a minute (checkout always prices live).
 */
export const REVALIDATE_SECONDS = 60;

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

/** The flash or seasonal sale running now, or null (also when the backend is unreachable). */
export async function getActiveSale(): Promise<ActiveSale | null> {
  try {
    return ok(await api.GET('/v1/catalog/sale')).sale;
  } catch {
    return null;
  }
}
