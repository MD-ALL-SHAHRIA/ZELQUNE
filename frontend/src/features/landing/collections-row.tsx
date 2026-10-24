import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { HERO_SCENES, SAMPLE } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatNumber } from '@/i18n/format';
import { type Category } from '@/shared/api/types';
import { href } from '@/shared/lib/site';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';
import { CollectionsArrows } from './collections-row.client';

/** A wide room scene per collection until each category has its own photo. */
const SCENE_FOR: Record<string, string> = {
  'wall-panels': HERO_SCENES[0].src,
  lighting: HERO_SCENES[1].src,
  shelves: HERO_SCENES[2].src,
};

export interface Collection {
  category: Category;
  count: number;
  /** The owner's cover photo (dashboard), else a built-in room scene. */
  imageUrl?: string | null;
}

/**
 * "Find your perfect piece" (owner's reference): the title and a link on the left, wide room
 * cards on the right in a row that scrolls (arrows, swipe, snap). Collections come from the
 * catalog in its own order, so a new category appears here by itself.
 */
export function CollectionsRow({
  lang,
  dict,
  collections,
}: {
  lang: Locale;
  dict: Dictionary;
  collections: Collection[];
}) {
  if (!collections.length) return null;
  const h = dict.home2;
  return (
    <section aria-labelledby="collections-heading" className="py-20 sm:py-28">
      <Container className="grid gap-10 lg:grid-cols-[minmax(0,0.32fr)_minmax(0,1fr)] lg:items-center lg:gap-14">
        <div className="reveal space-y-5">
          <Eyebrow>{h.categoriesEyebrow}</Eyebrow>
          <Heading id="collections-heading">{h.categoriesHeading}</Heading>
          <div className="flex items-center justify-between gap-6 pt-2 lg:flex-col lg:items-start">
            <Link
              href={href(lang, '/shop')}
              className="group inline-flex items-center gap-3 border-b border-ink pb-1 text-[0.72rem] font-medium uppercase tracking-[0.18em] [:lang(bn)_&]:text-[0.9rem] [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal"
            >
              {h.categoriesAll}
              <ArrowRight
                aria-hidden
                strokeWidth={1.25}
                className="size-4 transition-transform duration-500 ease-out-soft group-hover:translate-x-1"
              />
            </Link>
            {collections.length > 1 ? (
              <CollectionsArrows
                targetId="collections-row"
                labels={{ prev: h.categoriesPrev, next: h.categoriesNext }}
              />
            ) : null}
          </div>
        </div>

        <ul
          id="collections-row"
          className="-mx-5 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-px-5 px-5 pb-2 [scrollbar-width:none] md:-mx-10 md:scroll-px-10 md:px-10 lg:mx-0 lg:scroll-px-0 lg:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {collections.map(({ category: c, count, imageUrl }) => {
            const name = lang === 'bn' ? c.nameBn : c.nameEn;
            return (
              <li
                key={c.id}
                className="reveal w-[82%] shrink-0 snap-start sm:w-[58%] lg:w-[calc((100%-3rem)/2.4)]"
              >
                <Link href={href(lang, `/category/${c.slug}`)} className="group block">
                  <div className="relative aspect-[16/10] overflow-hidden bg-sand">
                    <Image
                      src={imageUrl ?? SCENE_FOR[c.slug] ?? SAMPLE.livingNeutral.src}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 58vw, 82vw"
                      className="object-cover object-[72%_50%] transition-transform duration-[1.6s] ease-out-soft group-hover:scale-[1.05]"
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-4 border-b border-ink/15 pb-3">
                    <div className="min-w-0">
                      <p className="truncate text-[0.72rem] font-medium uppercase tracking-[0.2em] text-ink [:lang(bn)_&]:text-[0.95rem] [:lang(bn)_&]:normal-case [:lang(bn)_&]:tracking-normal">
                        {name}
                      </p>
                      <p className="mt-1 text-[0.8rem] text-stone">
                        {fill(h.categoriesCount, { n: formatNumber(count, lang) })}
                      </p>
                    </div>
                    <ArrowRight
                      aria-hidden
                      strokeWidth={1.1}
                      className="size-5 shrink-0 text-ink transition-transform duration-500 ease-out-soft group-hover:translate-x-1.5"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
