import Image from 'next/image';
import Link from 'next/link';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatNumber, formatTaka } from '@/i18n/format';
import { type ProductSummary } from '@/shared/api/types';
import { cn } from '@/shared/lib/cn';
import { href } from '@/shared/lib/site';
import { finishColor } from './finishes';
import { productImages } from './product-images';
import { productName } from './product-copy';
import { SaleBadge } from './sale-badge';

const DEFAULT_SIZES = '(min-width: 1024px) 31vw, (min-width: 640px) 46vw, 92vw';

/**
 * Product tile in the RH / Ferm Living manner: a large image on a soft neutral field (the second
 * photo fades in on hover), the sale-mode badge, name, price and the finish swatches.
 */
export function ProductCard({
  product,
  lang,
  dict,
  finishes = [],
  priority = false,
  sizes = DEFAULT_SIZES,
  headingLevel = 'h3',
}: {
  product: ProductSummary;
  lang: Locale;
  dict: Dictionary;
  /** Finish option values (e.g. WALNUT, NATURAL); swatches are shown when known. */
  finishes?: string[];
  priority?: boolean;
  sizes?: string;
  /** h2 where the cards sit directly under the page h1 (listings), else h3. */
  headingLevel?: 'h2' | 'h3';
}) {
  const Title = headingLevel;
  const name = productName(product, lang, dict);
  const [first, second] = productImages(
    product.primaryMedia ? [product.primaryMedia] : [],
    name,
    lang,
    product.slug,
  );
  // Catalog photos are product shots: shown whole on the neutral field. Samples fill the frame.
  const fit = first && !first.sample ? 'object-contain p-[8%]' : 'object-cover';
  return (
    <Link
      href={href(lang, `/products/${product.slug}`)}
      className="group block focus-visible:outline-offset-4"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[#EFE8DC]">
        {first ? (
          <Image
            src={first.src}
            alt={first.alt}
            fill
            priority={priority}
            sizes={sizes}
            className={cn(
              fit,
              'transition duration-[1.2s] ease-out-soft group-hover:scale-[1.025]',
              second && 'group-hover:opacity-0',
            )}
          />
        ) : null}
        {second ? (
          <Image
            src={second.src}
            alt=""
            fill
            sizes={sizes}
            className={cn(
              second.sample ? 'object-cover' : 'object-contain p-[8%]',
              'opacity-0 transition-opacity duration-700 ease-out-soft group-hover:opacity-100',
            )}
          />
        ) : null}
        <div className="absolute left-3 top-3 right-3">
          <SaleBadge
            dict={dict}
            lang={lang}
            saleMode={product.saleMode}
            leadTimeDays={product.leadTimeDays}
            marked={false}
          />
        </div>
      </div>
      <div className="mt-5 space-y-2.5">
        <div className="flex items-baseline justify-between gap-4">
          <Title className="font-display text-[1.45rem] font-light leading-tight underline-offset-[5px] decoration-1 group-hover:underline [:lang(bn)_&]:text-lg [:lang(bn)_&]:font-normal">
            {name}
          </Title>
          {product.fromPrice ? (
            <p className="shrink-0 text-[0.85rem] tabular-nums tracking-wide text-ink/85">
              {/* Several finishes can be priced differently: the card shows the lowest. */}
              {finishes.length > 1
                ? fill(dict.ui.from, { price: formatTaka(product.fromPrice.amountPaisa, lang) })
                : formatTaka(product.fromPrice.amountPaisa, lang)}
            </p>
          ) : null}
        </div>
        {finishes.length ? (
          <div className="flex items-center gap-2.5 text-xs text-stone">
            <span className="flex -space-x-0.5" aria-hidden>
              {finishes.map((f) => (
                <span
                  key={f}
                  title={dict.product.variants[f] ?? f}
                  className="size-3.5 rounded-full border border-paper ring-1 ring-ink/15"
                  style={{ background: finishColor(f) }}
                />
              ))}
            </span>
            <span>
              {finishes.length > 1
                ? fill(dict.listing.finishes, { n: formatNumber(finishes.length, lang) })
                : (dict.product.variants[finishes[0] ?? ''] ?? finishes[0])}
            </span>
          </div>
        ) : null}
      </div>
    </Link>
  );
}
