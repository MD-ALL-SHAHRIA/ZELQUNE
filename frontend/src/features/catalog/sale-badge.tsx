import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatNumber } from '@/i18n/format';
import { type Locale } from '@/i18n/config';
import { type SaleMode } from '@/shared/api/types';
import { CopyText } from '@/shared/ui/copy-text';
import { DEFAULT_LEAD_DAYS } from './product-copy';

/**
 * Badge text for a sale mode. The lead time comes from the catalog (the default making time
 * until it is set). Only IN_STOCK products can ever say "in stock".
 */
export function saleBadgeText(
  dict: Dictionary,
  lang: Locale,
  saleMode: SaleMode,
  leadTimeDays: number | null | undefined,
): string {
  const days = formatNumber(leadTimeDays || DEFAULT_LEAD_DAYS, lang);
  return fill(dict.product.badge[saleMode], { days });
}

export function SaleBadge(props: {
  dict: Dictionary;
  lang: Locale;
  saleMode: SaleMode;
  leadTimeDays: number | null | undefined;
  /** Product cards pass false: only the page's own product carries data-sale-mode. */
  marked?: boolean;
}) {
  return (
    <span
      data-sale-mode={props.marked === false ? undefined : props.saleMode}
      className="inline-flex items-center gap-2 bg-paper/90 px-2.5 py-1 text-[0.68rem] font-medium uppercase tracking-[0.12em] text-ink [:lang(bn)_&]:text-xs [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal"
    >
      <span
        aria-hidden
        className={
          props.saleMode === 'IN_STOCK'
            ? 'size-1.5 rounded-full bg-success'
            : 'size-1.5 rounded-full bg-amber'
        }
      />
      <CopyText>
        {saleBadgeText(props.dict, props.lang, props.saleMode, props.leadTimeDays)}
      </CopyText>
    </span>
  );
}
