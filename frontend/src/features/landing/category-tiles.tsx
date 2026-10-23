import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { SAMPLE } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { type Category } from '@/shared/api/types';
import { cn } from '@/shared/lib/cn';
import { href } from '@/shared/lib/site';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';
import { numeral } from './numeral';

/** Lookalike sample photo per category until real product photos exist. */
const CATEGORY_IMAGE: Record<string, string> = {
  'wall-panels': SAMPLE.moonPanel.src,
  shelves: SAMPLE.aurora.src,
  lighting: SAMPLE.halfMoonPlanter.src,
};

/**
 * Tall image cards in a staggered row (the middle card steps down), each with a numeral and
 * name on the photo. On phones: one wide lead card, then a pair.
 */
export function CategoryTiles({
  lang,
  dict,
  categories,
}: {
  lang: Locale;
  dict: Dictionary;
  categories: Category[];
}) {
  if (!categories.length) return null;
  return (
    <section className="py-20 sm:py-28 lg:pb-40">
      <Container>
        <div className="reveal mb-14 flex flex-wrap items-end justify-between gap-6 lg:mb-20">
          <div className="space-y-5">
            <Eyebrow>{dict.home2.categoriesEyebrow}</Eyebrow>
            <Heading>{dict.home2.categoriesHeading}</Heading>
          </div>
          <Link
            href={href(lang, '/shop')}
            className="group inline-flex items-center gap-3 border-b border-ink pb-1 text-sm"
          >
            {dict.nav2.allProducts}
            <ArrowRight
              aria-hidden
              strokeWidth={1.25}
              className="size-4 transition-transform duration-500 ease-out-soft group-hover:translate-x-1"
            />
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 lg:gap-8">
          {categories.map((c, i) => {
            const lead = i === 0;
            return (
              <li
                key={c.id}
                className={cn(
                  'reveal',
                  lead && 'col-span-2 lg:col-span-1',
                  i % 3 === 1 && 'lg:mt-28',
                )}
              >
                <Link
                  href={href(lang, `/category/${c.slug}`)}
                  className="group relative block overflow-hidden bg-sand"
                >
                  <div
                    className={cn(
                      'relative',
                      lead ? 'aspect-[4/3] lg:aspect-[2/3]' : 'aspect-[3/4] lg:aspect-[2/3]',
                    )}
                  >
                    <Image
                      src={CATEGORY_IMAGE[c.slug] ?? SAMPLE.livingNeutral.src}
                      alt=""
                      fill
                      sizes={
                        lead ? '(min-width: 1024px) 30vw, 92vw' : '(min-width: 1024px) 30vw, 46vw'
                      }
                      className="object-cover transition-transform duration-[1.6s] ease-out-soft group-hover:scale-[1.04]"
                    />
                  </div>
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(53,58,48,0.28)_0%,rgba(53,58,48,0)_22%,rgba(53,58,48,0)_50%,rgba(53,58,48,0.62)_100%)]" />
                  <span className="absolute left-4 top-4 font-display text-lg italic text-paper/90 sm:left-6 sm:top-6">
                    {numeral(i + 1, lang)}
                  </span>
                  <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 text-paper sm:inset-x-6 sm:bottom-6">
                    <p className="font-display text-2xl font-light leading-none sm:text-4xl">
                      {lang === 'bn' ? c.nameBn : c.nameEn}
                    </p>
                    <ArrowRight
                      aria-hidden
                      strokeWidth={1}
                      className="size-5 shrink-0 -translate-x-1 opacity-0 transition duration-500 ease-out-soft group-hover:translate-x-0 group-hover:opacity-100 sm:size-6"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-[0.7rem] text-stone">{dict.landing.sampleNote}</p>
      </Container>
    </section>
  );
}
