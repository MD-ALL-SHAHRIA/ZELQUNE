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
import { SplitText } from '@/shared/ui/split-text';

/** A room scene per collection (and where its piece sits) until each category has its own photo. */
const SCENE_FOR: Record<string, { src: string; position: string }> = {
  // The scenes are wide (16:9) with the piece near the right; these centre it in a tall arch.
  'wall-panels': { src: HERO_SCENES[0].src, position: '95% 50%' },
  lighting: { src: HERO_SCENES[1].src, position: '96% 50%' },
  shelves: { src: HERO_SCENES[2].src, position: '96% 50%' },
};

export interface Collection {
  category: Category;
  count: number;
  /** The owner's cover photo (dashboard), else a built-in room scene. */
  imageUrl?: string | null;
}

/**
 * "Find your perfect piece": each collection stands in a tall arch, the house's one curve, like
 * pieces hung in a gallery. Three across on desktop with the middle one set lower; a swipe row
 * on phones. Collections come from the catalog in its own order, so a new one appears here by
 * itself.
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
    <section
      aria-labelledby="collections-heading"
      className="overflow-hidden py-20 sm:py-28 lg:py-36"
    >
      <Container>
        <div className="reveal flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
          <div className="space-y-5">
            <Eyebrow>{h.categoriesEyebrow}</Eyebrow>
            <Heading id="collections-heading">
              <SplitText text={h.categoriesHeading} />
            </Heading>
          </div>
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
        </div>

        <ul className="-mx-5 mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-5 px-5 pb-4 [scrollbar-width:none] sm:mt-16 md:-mx-10 md:scroll-px-10 md:px-10 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-10 lg:overflow-visible lg:px-0 lg:pb-16 xl:gap-14 [&::-webkit-scrollbar]:hidden">
          {collections.map(({ category: c, count, imageUrl }) => {
            const name = lang === 'bn' ? c.nameBn : c.nameEn;
            const scene = SCENE_FOR[c.slug];
            return (
              <li
                key={c.id}
                className="reveal w-[74%] shrink-0 snap-start sm:w-[44%] lg:w-auto lg:even:translate-y-16"
              >
                <Link href={href(lang, `/category/${c.slug}`)} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden rounded-t-full bg-sand">
                    <Image
                      src={imageUrl ?? scene?.src ?? SAMPLE.livingNeutral.src}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 44vw, 74vw"
                      className="object-cover transition-transform duration-[1.6s] ease-out-soft group-hover:scale-[1.04]"
                      style={{
                        objectPosition: imageUrl ? '50% 50%' : (scene?.position ?? '50% 50%'),
                      }}
                    />
                    {/* A hairline arch just inside the photo, like a gallery mount. */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-3 rounded-t-full border border-ivory/45 transition-colors duration-700 group-hover:border-ivory/80"
                    />
                  </div>
                  <div className="mt-6 flex items-baseline justify-between gap-4 border-b border-ink/15 pb-4">
                    <h3 className="font-display text-[1.9rem] font-medium leading-none tracking-[-0.01em] sm:text-[2.2rem] [:lang(bn)_&]:text-[1.6rem] [:lang(bn)_&]:font-normal [:lang(bn)_&]:leading-tight">
                      {name}
                    </h3>
                    <span className="flex shrink-0 items-center gap-2 text-[0.8rem] text-stone">
                      {fill(h.categoriesCount, { n: formatNumber(count, lang) })}
                      <ArrowRight
                        aria-hidden
                        strokeWidth={1.1}
                        className="size-4 text-ink transition-transform duration-500 ease-out-soft group-hover:translate-x-1"
                      />
                    </span>
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
