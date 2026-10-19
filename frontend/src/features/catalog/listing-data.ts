import 'server-only';
import { getProduct, listProducts } from '@/shared/api/server';
import { type Category, type ProductSummary } from '@/shared/api/types';
import { type PriceSegment } from '@/shared/lib/visitor';
import { variantValue } from './finishes';

export interface ListingProduct extends ProductSummary {
  /** Finish option values of the product's variants, in catalog order (e.g. WALNUT, NATURAL). */
  finishes: string[];
}

/**
 * Adds each product's finishes (for the card swatches). Product details are fetch-cached with
 * the same ISR window as the list, so this costs nothing after the first render.
 */
export async function withFinishes(
  products: ProductSummary[],
  segment: PriceSegment,
): Promise<ListingProduct[]> {
  const details = await Promise.all(
    products.map((p) => getProduct(p.slug, segment).catch(() => null)),
  );
  return products.map((p, i) => ({
    ...p,
    finishes: [...new Set(details[i]?.variants.map(variantValue) ?? [])],
  }));
}

/** Products for a listing page (all products, or one category), with finishes. */
export async function listingProducts(segment: PriceSegment, category?: string) {
  return withFinishes(await listProducts(segment, category), segment);
}

/** "You may also like": same category first, then the rest of the catalog. */
export async function relatedProducts(
  segment: PriceSegment,
  slug: string,
  category: string | undefined,
  limit = 4,
): Promise<ListingProduct[]> {
  const [same, all] = await Promise.all([
    category ? listProducts(segment, category) : Promise.resolve([]),
    listProducts(segment),
  ]);
  const seen = new Set<string>([slug]);
  const picked: ProductSummary[] = [];
  for (const p of [...same, ...all]) {
    if (picked.length >= limit) break;
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    picked.push(p);
  }
  return withFinishes(picked, segment);
}

/** Category order for the sub-navigation: catalog position, then the brand's preferred order. */
const PREFERRED = ['wall-panels', 'shelves', 'lighting'];

export function orderCategories(categories: Category[]): Category[] {
  const rank = (slug: string) => {
    const i = PREFERRED.indexOf(slug);
    return i === -1 ? PREFERRED.length : i;
  };
  return categories
    .filter((c) => !c.parentId)
    .sort((a, b) => a.position - b.position || rank(a.slug) - rank(b.slug));
}
