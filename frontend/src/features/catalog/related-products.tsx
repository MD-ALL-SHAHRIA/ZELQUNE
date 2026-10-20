import { ArrowRight } from 'lucide-react';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { href } from '@/shared/lib/site';
import { ButtonLink } from '@/shared/ui/button';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';
import { type ListingProduct } from './listing-data';
import { ProductCard } from './product-card';

/**
 * "You may also like": a swipe strip on phones (the next card peeks in), a four-up row on desktop.
 */
export function RelatedProducts({
  products,
  lang,
  dict,
  eyebrow,
}: {
  products: ListingProduct[];
  lang: Locale;
  dict: Dictionary;
  eyebrow: string;
}) {
  if (!products.length) return null;
  return (
    <section
      aria-labelledby="related-heading"
      className="py-20 sm:py-28"
      data-testid="related-products"
    >
      <Container className="mb-10 flex flex-wrap items-end justify-between gap-6 sm:mb-12">
        <div className="space-y-4">
          <Eyebrow>{eyebrow}</Eyebrow>
          <Heading id="related-heading" level="h2">
            {dict.product.related}
          </Heading>
        </div>
        <ButtonLink href={href(lang, '/shop')} variant="ghost" className="group">
          {dict.nav2.allProducts}
          <ArrowRight
            aria-hidden
            strokeWidth={1.25}
            className="size-4 transition-transform duration-300 group-hover:translate-x-1"
          />
        </ButtonLink>
      </Container>
      <ul className="scrollbar-none mx-auto flex max-w-[1440px] snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 md:scroll-px-10 md:px-10 lg:grid lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12 lg:overflow-visible">
        {products.map((p) => (
          <li key={p.id} className="w-[72vw] shrink-0 snap-start sm:w-[44vw] lg:w-auto">
            <ProductCard
              product={p}
              lang={lang}
              dict={dict}
              finishes={p.finishes}
              sizes="(min-width: 1440px) 330px, (min-width: 1024px) 23vw, (min-width: 640px) 44vw, 72vw"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
