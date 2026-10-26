import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatNumber } from '@/i18n/format';

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

/** Making time shown while a product has no lead time in the catalog. */
const DEFAULT_LEAD_DAYS = 10;

/** "Made for you" steps: `{days}` becomes the product's lead time (or the default). */
export function timelineSteps(
  steps: readonly { title: string; text: string }[],
  leadTimeDays: number | null | undefined,
  lang: Locale,
): { title: string; text: string }[] {
  const days = formatNumber(leadTimeDays || DEFAULT_LEAD_DAYS, lang);
  return steps.map((s) => ({ ...s, text: s.text.replaceAll('{days}', days) }));
}

/** Prefilled WhatsApp message naming the product. */
export function chatMessage(dict: Dictionary, name: string): string {
  return fill(dict.premium.chat.message, { item: name });
}
