import {
  type CategoryView,
  type MediaView,
  type ProductDetail,
  type ProductSummary,
  type ResolvedPrice,
  type VariantView,
} from '@zelqune/contracts';
import { lowestPrice, resolvePrice } from '../pricing/price-resolution';
import { type StorageProvider } from '../storage/storage.provider';
import { type PublicProductRow } from './catalog.repository';

type VariantRow = PublicProductRow['variants'][number];
type MediaRow = PublicProductRow['media'][number];
type CategoryRow = PublicProductRow['categories'][number]['category'];

export function toOptions(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (e): e is [string, string] => typeof e[1] === 'string',
    ),
  );
}

export function variantPrice(
  variant: VariantRow,
  p: string | undefined,
  now: Date,
): ResolvedPrice | null {
  return resolvePrice({ prices: variant.prices, experiments: variant.experiments, p, now });
}

export function toCategoryView(c: CategoryRow): CategoryView {
  return {
    id: c.id,
    parentId: c.parentId,
    slug: c.slug,
    nameBn: c.nameBn,
    nameEn: c.nameEn,
    position: c.position,
  };
}

export class CatalogMapper {
  constructor(private readonly storage: StorageProvider) {}

  media(m: MediaRow): MediaView {
    return {
      id: m.id,
      url: this.storage.publicUrl(m.storageKey),
      mimeType: m.mimeType,
      altBn: m.altBn,
      altEn: m.altEn,
      position: m.position,
      variantId: m.variantId,
    };
  }

  variant(v: VariantRow, p: string | undefined, now: Date): VariantView {
    return {
      id: v.id,
      sku: v.sku,
      options: toOptions(v.options),
      weightGrams: v.weightGrams,
      dimensions: { widthMm: v.widthMm, heightMm: v.heightMm, depthMm: v.depthMm },
      position: v.position,
      price: variantPrice(v, p, now),
    };
  }

  summary(row: PublicProductRow, p: string | undefined, now: Date): ProductSummary {
    const productMedia = row.media.find((m) => m.variantId === null) ?? row.media[0];
    return {
      id: row.id,
      slug: row.slug,
      nameBn: row.nameBn,
      nameEn: row.nameEn,
      saleMode: row.saleMode,
      leadTimeDays: row.leadTimeDays,
      fromPrice: lowestPrice(row.variants.map((v) => variantPrice(v, p, now))),
      primaryMedia: productMedia ? this.media(productMedia) : null,
    };
  }

  detail(row: PublicProductRow, p: string | undefined, now: Date): ProductDetail {
    return {
      ...this.summary(row, p, now),
      descriptionBn: row.descriptionBn,
      descriptionEn: row.descriptionEn,
      seo: {
        titleBn: row.seoTitleBn,
        titleEn: row.seoTitleEn,
        descriptionBn: row.seoDescriptionBn,
        descriptionEn: row.seoDescriptionEn,
      },
      categories: row.categories
        .filter((pc) => pc.category.isActive)
        .map(({ category: c }) => ({ id: c.id, slug: c.slug, nameBn: c.nameBn, nameEn: c.nameEn })),
      variants: row.variants.map((v) => this.variant(v, p, now)),
      media: row.media.map((m) => this.media(m)),
    };
  }
}
