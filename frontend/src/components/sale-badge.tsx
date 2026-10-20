import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatNumber } from '@/i18n/format';
import { type Locale } from '@/i18n/config';
import { type SaleMode } from '@/lib/api-types';
import { Text } from './text';

/**
 * Badge text for a sale mode. The lead time comes from the catalog; until it is set it stays the
 * visible `[[N]]` placeholder. Only IN_STOCK products can ever say "in stock".
 */
export function saleBadgeText(
  dict: Dictionary,
  lang: Locale,
  saleMode: SaleMode,
  leadTimeDays: number | null | undefined,
): string {
  const days = leadTimeDays ? formatNumber(leadTimeDays, lang) : '[[N]]';
  return fill(dict.product.badge[saleMode], { days });
}

export function SaleBadge(props: {
  dict: Dictionary;
  lang: Locale;
  saleMode: SaleMode;
  leadTimeDays: number | null | undefined;
}) {
  const tone =
    props.saleMode === 'IN_STOCK' ? 'bg-success/10 text-success' : 'bg-amber/25 text-walnut';
  return (
    <span
      data-sale-mode={props.saleMode}
      className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${tone}`}
    >
      <Text>{saleBadgeText(props.dict, props.lang, props.saleMode, props.leadTimeDays)}</Text>
    </span>
  );
}
