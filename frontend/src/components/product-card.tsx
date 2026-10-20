import Link from 'next/link';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { formatTaka } from '@/i18n/format';
import { type ProductSummary } from '@/lib/api-types';
import { productName } from '@/lib/product-copy';
import { href } from '@/lib/site';
import { Photo } from './photo';
import { SaleBadge } from './sale-badge';

export function ProductCard({
  product,
  lang,
  dict,
}: {
  product: ProductSummary;
  lang: Locale;
  dict: Dictionary;
}) {
  const name = productName(product, lang, dict);
  const alt = (lang === 'bn' ? product.primaryMedia?.altBn : product.primaryMedia?.altEn) ?? name;
  return (
    <Link
      href={href(lang, `/products/${product.slug}`)}
      className="group block rounded-lg bg-surface p-3 shadow-sm ring-1 ring-line transition hover:ring-walnut"
    >
      <Photo
        src={product.primaryMedia?.url}
        alt={alt}
        placeholder={dict.ui.photoPlaceholder}
        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
      />
      <div className="mt-3 space-y-2">
        <h3 className="text-lg font-semibold text-walnut group-hover:underline">{name}</h3>
        <SaleBadge
          dict={dict}
          lang={lang}
          saleMode={product.saleMode}
          leadTimeDays={product.leadTimeDays}
        />
        {product.fromPrice ? (
          <p className="text-lg font-semibold">{formatTaka(product.fromPrice.amountPaisa, lang)}</p>
        ) : null}
      </div>
    </Link>
  );
}
