import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ProductCard } from '@/features/catalog/product-card';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { type ProductSummary } from '@/shared/api/types';
import { href } from '@/shared/lib/site';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';
import { PinnedTrack } from '@/shared/ui/pinned-track';
import { SplitText } from '@/shared/ui/split-text';

/**
 * The collection as a horizontal rail: aligned to the page grid on the left, bleeding off the
 * right edge. On desktop it pins and slides sideways with the page scroll (PinnedTrack); on
 * phones it is a native scroll-snap row.
 */
export function ProductRail({
  products,
  lang,
  dict,
}: {
  products: ProductSummary[];
  lang: Locale;
  dict: Dictionary;
}) {
  if (!products.length) return null;
  return (
    <section className="py-24 sm:py-32" aria-labelledby="rail-heading">
      <PinnedTrack>
        <Container className="reveal mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="space-y-5">
            <Eyebrow>{dict.layout.columns.shop}</Eyebrow>
            <Heading id="rail-heading">
              <SplitText text={dict.shop.title} />
            </Heading>
          </div>
        </Container>
        <ul
          data-track
          className="reveal scrollbar-none flex snap-x snap-mandatory group-data-[pinned]/pin:snap-none group-data-[pinned]/pin:overflow-visible group-data-[pinned]/pin:will-change-transform gap-5 overflow-x-auto scroll-pl-5 px-5 pb-2 md:scroll-pl-10 md:gap-6 md:px-10 min-[1440px]:scroll-pl-[calc(50vw-680px)] min-[1440px]:px-[calc(50vw-680px)]"
        >
          {products.map((p) => (
            <li
              key={p.id}
              className="w-[74vw] max-w-[360px] shrink-0 snap-start sm:w-[42vw] lg:w-[26vw]"
            >
              <ProductCard product={p} lang={lang} dict={dict} />
            </li>
          ))}
          <li className="w-[74vw] max-w-[360px] shrink-0 snap-start sm:w-[42vw] lg:w-[26vw]">
            <Link
              href={href(lang, '/shop')}
              className="group flex aspect-[4/5] flex-col items-center justify-center gap-6 border border-line bg-cream text-center transition-colors duration-500 ease-out-soft hover:bg-cream"
            >
              <span
                aria-hidden
                className="flex h-28 w-20 items-center justify-center rounded-t-full border border-walnut/40 transition-colors duration-500 group-hover:border-walnut"
              >
                <ArrowRight
                  strokeWidth={1}
                  className="size-6 transition-transform duration-500 ease-out-soft group-hover:translate-x-1"
                />
              </span>
              <span className="font-display text-3xl font-medium">{dict.nav2.allProducts}</span>
            </Link>
          </li>
        </ul>
      </PinnedTrack>
    </section>
  );
}
