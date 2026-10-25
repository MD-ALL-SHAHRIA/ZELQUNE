import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatNumber, formatTaka } from '@/i18n/format';
import { type ResolvedPrice } from '@/shared/api/types';
import { cn } from '@/shared/lib/cn';
import { Countdown } from './countdown.client';
import { percentOff } from './countdown';

/**
 * A price as the catalog resolved it: the sale price with the regular price struck through and
 * the real percentage off while a sale runs; a flash sale also counts down to its end.
 */
export type PriceCopy = Pick<Dictionary['offers'], 'flashSale' | 'off' | 'endsIn' | 'time'> & {
  from: string;
};

export const priceCopy = (dict: Dictionary): PriceCopy => ({
  from: dict.ui.from,
  flashSale: dict.offers.flashSale,
  off: dict.offers.off,
  endsIn: dict.offers.endsIn,
  time: dict.offers.time,
});

export function PriceTag({
  price,
  lang,
  copy,
  from = false,
  size = 'card',
}: {
  price: ResolvedPrice;
  lang: Locale;
  copy: PriceCopy;
  /** "From ৳…" when finishes are priced differently. */
  from?: boolean;
  size?: 'card' | 'page';
}) {
  const amount = formatTaka(price.amountPaisa, lang);
  const regular = price.sale?.regularPaisa ?? price.compareAtPaisa;
  const off = regular ? percentOff(regular, price.amountPaisa) : 0;
  const page = size === 'page';
  return (
    <div className={cn('flex flex-col', page ? 'gap-3' : 'items-end gap-1')}>
      <div className={cn('flex items-baseline', page ? 'gap-4' : 'gap-2')}>
        <span
          data-testid={page ? 'price' : undefined}
          className={cn(
            'tabular-nums',
            page
              ? 'font-display text-[2.6rem] font-medium leading-none sm:text-[2.9rem]'
              : 'text-[0.85rem] tracking-wide text-ink/85',
            off && 'text-sale',
          )}
        >
          {from ? fill(copy.from, { price: amount }) : amount}
        </span>
        {off && regular ? (
          <del
            className={cn(
              'tabular-nums text-stone',
              page ? 'font-display text-2xl font-medium' : 'text-[0.78rem]',
            )}
          >
            {formatTaka(regular, lang)}
          </del>
        ) : null}
      </div>
      {off ? (
        <div
          className={cn(
            'flex flex-wrap items-center gap-x-3 gap-y-1',
            page ? 'text-[0.8rem]' : 'justify-end text-[0.68rem]',
          )}
        >
          <span className="bg-sale-fill px-2 py-0.5 font-medium uppercase tracking-[0.12em] text-ivory [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal">
            {price.sale?.flash ? `${copy.flashSale} · ` : ''}
            {fill(copy.off, { n: formatNumber(off, lang) })}
          </span>
          {page && price.sale ? (
            <Countdown
              endsAt={price.sale.endsAt}
              lang={lang}
              copy={copy}
              className="tabular-nums text-ink/75"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
