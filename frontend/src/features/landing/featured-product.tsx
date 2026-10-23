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
import { Picture } from '@/shared/ui/image';
import { Container, Heading, Lead } from '@/shared/ui/typography';

/**
 * The featured piece as an asymmetric editorial spread: a tall arch (the brand motif) with a
 * small detail photo stepping out of it, the name set large beside it, price as a quiet figure.
 */
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
  const [main, detail] = productImages(
    product.primaryMedia ? [product.primaryMedia] : [],
    name,
    lang,
    product.slug,
  );
  const link = href(lang, `/products/${product.slug}`);
  return (
    <section className="glow relative overflow-hidden py-24 sm:py-32 lg:pb-28 lg:pt-36">
      <Container className="grid gap-16 lg:grid-cols-12 lg:items-center lg:gap-x-6">
        {/* Image group (first on mobile, right on desktop). */}
        <div className="reveal lg:order-2 lg:col-span-6 lg:col-start-7">
          <div className="relative isolate ml-auto w-[78%] max-w-[500px] lg:w-[80%]">
            {main ? (
              <Picture
                src={main.src}
                alt={main.alt}
                sizes="(min-width: 1024px) 34vw, 78vw"
                ratio="aspect-[3/4.2]"
              />
            ) : null}
            {/* Gallery mount: a brass hairline frame offset behind the print, with a lamp glow. */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 translate-x-3 -translate-y-3 border border-walnut/60 sm:translate-x-6 sm:-translate-y-6"
            />
            <div
              aria-hidden
              className="absolute -inset-[18%] -z-20 bg-[radial-gradient(closest-side,rgba(242,197,138,0.16),transparent)]"
            />
            {detail ? (
              <div className="absolute -left-[24%] bottom-[9%] w-[44%] max-w-[220px] border-[6px] border-paper shadow-[0_30px_60px_-30px_rgba(43,30,25,0.5)] sm:border-8 lg:-left-[34%]">
                <Picture
                  src={detail.src}
                  alt=""
                  sizes="(min-width: 1024px) 15vw, 34vw"
                  ratio="aspect-[4/5]"
                />
              </div>
            ) : null}
          </div>
          {main?.sample ? (
            <p className="mt-4 text-right text-[0.7rem] text-stone">{dict.landing.sampleNote}</p>
          ) : null}
        </div>

        {/* Story. */}
        <div className="reveal space-y-8 lg:order-1 lg:col-span-5">
          <SaleBadge
            dict={dict}
            lang={lang}
            saleMode={product.saleMode}
            leadTimeDays={product.leadTimeDays}
          />
          <Heading level="display" className="lg:-mr-24">
            {name}
          </Heading>
          {copy ? <Lead className="max-w-md">{copy.short}</Lead> : null}
          {product.fromPrice ? (
            <p className="flex items-baseline gap-4 border-t border-ink/15 pt-6">
              <span className="font-display text-5xl font-light leading-none sm:text-6xl">
                {formatTaka(product.fromPrice.amountPaisa, lang)}
              </span>
            </p>
          ) : null}
          {copy ? (
            <ul className="grid gap-x-8 gap-y-2.5 text-sm text-ink/80 sm:grid-cols-2">
              {copy.whatYouGet.map((line) => (
                <li key={line} className="flex gap-3">
                  <span aria-hidden className="mt-[0.6rem] h-px w-3 shrink-0 bg-walnut" />
                  <span>
                    <CopyText>{line}</CopyText>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="space-y-4 pt-2">
            <ButtonLink href={link} size="lg">
              {dict.home.cta}
            </ButtonLink>
            <p className="max-w-sm text-sm text-stone">{dict.product.preOrderNote}</p>
          </div>
        </div>
      </Container>
    </section>
  );
}
