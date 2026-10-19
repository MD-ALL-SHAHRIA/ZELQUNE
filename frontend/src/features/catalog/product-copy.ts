import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';

/** Product names and descriptions come from the copy docs when written there, else the catalog. */
export function productName(
  product: { slug: string; nameEn: string; nameBn: string },
  lang: Locale,
  dict: Dictionary,
): string {
  return dict.products[product.slug]?.name ?? (lang === 'bn' ? product.nameBn : product.nameEn);
}

export function variantLabel(options: Record<string, unknown>, dict: Dictionary): string {
  const value = Object.values(options).find((v): v is string => typeof v === 'string') ?? '';
  return dict.product.variants[value] ?? value;
}
