import Link from 'next/link';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatNumber, formatTaka } from '@/i18n/format';
import { type ActiveSale } from '@/shared/api/types';
import { href } from '@/shared/lib/site';
import { Countdown } from './countdown.client';

/** The announcement bar while a sale runs: its name, the real discount and time left. */
export function SaleBar({
  sale,
  lang,
  dict,
}: {
  sale: ActiveSale;
  lang: Locale;
  dict: Dictionary;
}) {
  const name = lang === 'bn' ? sale.nameBn : sale.nameEn;
  const text =
    sale.kind === 'PERCENT'
      ? fill(dict.offers.bannerPercent, { name, n: formatNumber(sale.value, lang) })
      : fill(dict.offers.bannerFixed, { name, amount: formatTaka(sale.value, lang) });
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-sale-fill px-4 py-[0.6rem] text-center text-[0.62rem] uppercase leading-relaxed tracking-[0.2em] text-ivory sm:text-[0.66rem] [:lang(bn)_&]:text-[0.8rem] [:lang(bn)_&]:tracking-normal [:lang(bn)_&]:normal-case">
      <span className="font-medium">{text}</span>
      {sale.flash ? (
        <Countdown
          endsAt={sale.endsAt}
          lang={lang}
          copy={dict.offers}
          className="tabular-nums text-ivory/85"
        />
      ) : null}
      <Link
        href={href(lang, '/shop')}
        className="underline decoration-ivory/50 underline-offset-4 hover:decoration-ivory"
      >
        {dict.offers.shopSale}
      </Link>
    </p>
  );
}
