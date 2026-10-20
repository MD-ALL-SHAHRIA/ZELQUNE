import { ProductImages } from '@/features/catalog/product-gallery';
import { productImages } from '@/features/catalog/product-images';
import { productName } from '@/features/catalog/product-copy';
import { SaleBadge } from '@/features/catalog/sale-badge';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { formatTaka } from '@/i18n/format';
import { type ProductSummary } from '@/shared/api/types';
import { href } from '@/shared/lib/site';
import { ButtonLink } from '@/shared/ui/button';
import { CopyText } from '@/shared/ui/copy-text';
import { Container, Eyebrow, Heading, Lead } from '@/shared/ui/typography';

/** The hero product as an editorial split: arch-framed image beside the story and price. */
export function FeaturedProduct({
  product,
  lang,
  dict,
}: {
  product: ProductSummary;
  lang: Locale;
  dict: Dictionary;
}) {
  const name = productName(product, lang, dict);
  const copy = dict.products[product.slug];
  const images = productImages(product.primaryMedia ? [product.primaryMedia] : [], name, lang);
  return (
    <section className="glow relative py-24 sm:py-32">
      <Container className="grid items-center gap-14 lg:grid-cols-2 lg:gap-24">
        <div className="reveal mx-auto w-full max-w-xl">
          <ProductImages images={images.slice(0, 1)} arch note={dict.landing.sampleNote} />
        </div>
        <div className="reveal space-y-7">
          <SaleBadge
            dict={dict}
            lang={lang}
            saleMode={product.saleMode}
            leadTimeDays={product.leadTimeDays}
          />
          <Heading level="h1">{name}</Heading>
          {copy ? <Lead>{copy.short}</Lead> : null}
          {product.fromPrice ? (
            <p className="font-display text-4xl font-light">
              {formatTaka(product.fromPrice.amountPaisa, lang)}
            </p>
          ) : null}
          {copy ? (
            <ul className="grid gap-3 border-t border-line pt-6 text-sm sm:grid-cols-2">
              {copy.whatYouGet.map((line) => (
                <li key={line} className="flex gap-3">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-walnut" />
                  <span>
                    <CopyText>{line}</CopyText>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-4 pt-2">
            <ButtonLink href={href(lang, `/products/${product.slug}`)} size="lg">
              {dict.home.cta}
            </ButtonLink>
          </div>
          <p className="max-w-md text-sm text-stone">{dict.product.preOrderNote}</p>
        </div>
      </Container>
      <Eyebrow className="sr-only">{dict.products[product.slug]?.name}</Eyebrow>
    </section>
  );
}
