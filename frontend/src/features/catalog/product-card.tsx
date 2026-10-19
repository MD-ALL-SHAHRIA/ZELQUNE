import Image from 'next/image';
import Link from 'next/link';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { formatTaka } from '@/i18n/format';
import { type ProductSummary } from '@/shared/api/types';
import { href } from '@/shared/lib/site';
import { productImages } from './product-images';
import { productName } from './product-copy';
import { SaleBadge } from './sale-badge';

/** Product tile in the Ferm Living manner: quiet image field, badge, name, price. */
export function ProductCard({
  product,
  lang,
  dict,
  priority = false,
}: {
  product: ProductSummary;
  lang: Locale;
  dict: Dictionary;
  priority?: boolean;
}) {
  const name = productName(product, lang, dict);
  const [first, second] = productImages(
    product.primaryMedia ? [product.primaryMedia] : [],
    name,
    lang,
  );
  return (
    <Link href={href(lang, `/products/${product.slug}`)} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-sand">
        {first ? (
          <Image
            src={first.src}
            alt={first.alt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
            className="object-cover transition-opacity duration-700 ease-out-soft group-hover:opacity-0"
          />
        ) : null}
        {second ? (
          <Image
            src={second.src}
            alt=""
            fill
            sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
            className="object-cover opacity-0 transition-opacity duration-700 ease-out-soft group-hover:opacity-100"
          />
        ) : null}
        <div className="absolute left-3 top-3">
          <SaleBadge
            dict={dict}
            lang={lang}
            saleMode={product.saleMode}
            leadTimeDays={product.leadTimeDays}
          />
        </div>
      </div>
      <div className="mt-4 flex items-baseline justify-between gap-4">
        <h3 className="font-display text-2xl font-light leading-tight">{name}</h3>
        {product.fromPrice ? (
          <p className="shrink-0 text-sm tracking-wide">
            {formatTaka(product.fromPrice.amountPaisa, lang)}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
