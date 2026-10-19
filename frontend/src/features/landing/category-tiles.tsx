import Link from 'next/link';
import { SAMPLE } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { type Category } from '@/shared/api/types';
import { href } from '@/shared/lib/site';
import { Picture } from '@/shared/ui/image';
import { Container, Eyebrow, Heading } from '@/shared/ui/typography';

/** Lookalike sample photo per category until real product photos exist. */
const CATEGORY_IMAGE: Record<string, string> = {
  'wall-panels': SAMPLE.slatsWarm.src,
  shelves: SAMPLE.shelvesPlants.src,
  lighting: SAMPLE.living.src,
};

/** Ferm Living-style category tiles: image, label bottom-left. */
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
    <section className="py-24 sm:py-32">
      <Container>
        <div className="reveal mb-12 space-y-5">
          <Eyebrow>{dict.home2.categoriesEyebrow}</Eyebrow>
          <Heading>{dict.home2.categoriesHeading}</Heading>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={href(lang, `/category/${c.slug}`)}
              className="reveal group relative block overflow-hidden"
            >
              <Picture
                src={CATEGORY_IMAGE[c.slug] ?? SAMPLE.livingNeutral.src}
                alt=""
                sizes="(min-width: 640px) 32vw, 92vw"
                ratio="aspect-[3/4]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/0 to-ink/0" />
              <p className="absolute bottom-5 left-5 font-display text-3xl font-light text-paper">
                {lang === 'bn' ? c.nameBn : c.nameEn}
              </p>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
