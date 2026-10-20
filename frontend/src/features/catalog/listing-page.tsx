import Image from 'next/image';
import Link from 'next/link';
import { SAMPLE } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatNumber } from '@/i18n/format';
import { type Category } from '@/shared/api/types';
import { cn } from '@/shared/lib/cn';
import { href } from '@/shared/lib/site';
import { Container, Eyebrow, Heading, Lead } from '@/shared/ui/typography';
import { type ListingProduct } from './listing-data';
import { ListingGrid } from './listing-grid';
import { ProductCard } from './product-card';

type SampleKey = keyof typeof SAMPLE;

/**
 * Hero photography per category (wide room shot + an arch-framed detail). Chosen so the hero
 * never repeats a product card's own photo just below it.
 */
const HERO: Record<string, [SampleKey, SampleKey]> = {
  'wall-panels': ['slats', 'hotelLobby'],
  shelves: ['livingShelves', 'bedroom'],
  lighting: ['cafeLights', 'sconceNight'],
};
const SHOP_HERO: [SampleKey, SampleKey] = ['homeHero', 'living'];

const catName = (c: { nameEn: string; nameBn: string }, lang: Locale) =>
  lang === 'bn' ? c.nameBn : c.nameEn;

/**
 * Shop and category listing pages (RH-style): a title band with the category's own photography,
 * breadcrumb, category pills, then the slim toolbar and a calm grid of large product images.
 */
export function ListingPage({
  lang,
  dict,
  categories,
  active,
  products,
}: {
  lang: Locale;
  dict: Dictionary;
  categories: Category[];
  /** The current category, or null for all products (/shop). */
  active: Category | null;
  products: ListingProduct[];
}) {
  const title = active ? catName(active, lang) : dict.shop.title;
  // The line under the title: the category's line from the copy docs, else the brand line.
  const line = (active && dict.listing.categoryLines[active.slug]) || dict.brand.seoDescription;
  const [wide, detail] = (active && HERO[active.slug]) || SHOP_HERO;

  const pills = [
    { key: 'all', label: dict.nav2.allProducts, href: href(lang, '/shop'), current: !active },
    ...categories.map((c) => ({
      key: c.slug,
      label: catName(c, lang),
      href: href(lang, `/category/${c.slug}`),
      current: active?.slug === c.slug,
    })),
  ];

  return (
    <>
      <header
        className="glow overflow-hidden"
        data-testid="listing-hero"
        data-category={active?.slug ?? 'all'}
      >
        <Container className="pt-5 lg:pt-7">
          <nav aria-label="Breadcrumb" className="text-xs text-stone">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <li>
                <Link href={href(lang)} className="transition-colors hover:text-ink">
                  {dict.nav.home}
                </Link>
              </li>
              <li aria-hidden>/</li>
              {active ? (
                <>
                  <li>
                    <Link href={href(lang, '/shop')} className="transition-colors hover:text-ink">
                      {dict.nav.shop}
                    </Link>
                  </li>
                  <li aria-hidden>/</li>
                </>
              ) : null}
              <li aria-current="page" className="text-ink">
                {title}
              </li>
            </ol>
          </nav>
        </Container>

        <Container className="grid items-end gap-8 pb-10 pt-6 md:pb-14 lg:grid-cols-12 lg:gap-12 lg:pb-16 lg:pt-8">
          <div className="relative order-1 lg:order-2 lg:col-span-7">
            <div className="relative -mx-5 aspect-[3/2] overflow-hidden bg-sand md:mx-0 lg:aspect-[16/11]">
              <Image
                src={SAMPLE[wide].src}
                alt=""
                fill
                preload
                sizes="(min-width: 1440px) 780px, (min-width: 1024px) 55vw, 100vw"
                className="object-cover"
              />
            </div>
            {/* The arch: the brand's one curved motif, as a detail photo overlapping the frame. */}
            <div className="absolute -bottom-6 -left-10 hidden w-[24%] border-[6px] border-paper bg-paper xl:block rounded-t-[999px]">
              <div className="relative aspect-[3/4] overflow-hidden rounded-t-[999px] bg-sand">
                <Image
                  src={SAMPLE[detail].src}
                  alt=""
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          <div className="order-2 space-y-5 lg:order-1 lg:col-span-5 lg:pb-4">
            <Eyebrow>{active ? dict.nav2.byCategory : dict.nav.shop}</Eyebrow>
            <Heading as="h1" level="display">
              {title}
            </Heading>
            {line ? <Lead className="max-w-md text-pretty">{line}</Lead> : null}
            <p className="text-sm text-stone">
              {fill(dict.listing.results, { n: formatNumber(products.length, lang) })}
            </p>
          </div>
        </Container>
      </header>

      <Container className="pb-24 pt-6 md:pt-8">
        <nav aria-label={dict.nav2.byCategory} className="mb-6 md:mb-8">
          <ul className="scrollbar-none -mx-5 flex gap-7 overflow-x-auto px-5 md:mx-0 md:gap-10 md:px-0">
            {pills.map((p) => (
              <li key={p.key} className="shrink-0">
                <Link
                  href={p.href}
                  aria-current={p.current ? 'page' : undefined}
                  className={cn(
                    'relative inline-flex h-12 items-center text-[0.95rem] transition-colors duration-300 after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-left after:bg-ink after:transition-transform after:duration-500 after:ease-out-soft',
                    p.current
                      ? 'text-ink after:scale-x-100'
                      : 'text-ink/55 after:scale-x-0 hover:text-ink hover:after:scale-x-100',
                  )}
                >
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <ListingGrid
          lang={lang}
          copy={{ ...dict.listing, empty: dict.shop.empty }}
          editorial={<EditorialTile lang={lang} dict={dict} slug={active?.slug ?? null} />}
          emptyAction={
            active ? (
              <Link
                href={href(lang, '/shop')}
                className="text-sm underline decoration-ink/30 underline-offset-[5px] transition hover:decoration-ink"
              >
                {dict.nav2.allProducts}
              </Link>
            ) : null
          }
          items={products.map((p) => ({
            id: p.id,
            saleMode: p.saleMode,
            pricePaisa: p.fromPrice?.amountPaisa ?? null,
            card: (
              <ProductCard
                product={p}
                lang={lang}
                dict={dict}
                finishes={p.finishes}
                headingLevel="h2"
              />
            ),
          }))}
        />
        {products.length ? (
          <p className="mt-16 text-[0.7rem] tracking-wide text-stone">{dict.landing.sampleNote}</p>
        ) : null}
      </Container>
    </>
  );
}

/**
 * One editorial tile inside the grid (RH catalog pages break the rhythm with a room): the design
 * studio on most listings, the workshop story on wall panels. Existing copy and sample photos only.
 */
function EditorialTile({
  lang,
  dict,
  slug,
}: {
  lang: Locale;
  dict: Dictionary;
  slug: string | null;
}) {
  const craft = slug === 'wall-panels';
  const tile = craft
    ? {
        image: SAMPLE.craft.src,
        eyebrow: dict.landing.craftEyebrow,
        heading: dict.landing.craftHeading,
        text: dict.landing.craftText,
        cta: dict.landing.heroSecondary,
        target: href(lang, '/story'),
      }
    : {
        image:
          SAMPLE[
            slug === 'lighting' ? 'restaurant' : slug === 'shelves' ? 'dining' : 'livingShelves'
          ].src,
        eyebrow: dict.home2.designEyebrow,
        heading: dict.home2.designHeading,
        text: dict.home2.designText,
        cta: dict.home2.designCta,
        target: href(lang, '/design'),
      };
  return (
    <aside className="@container h-full">
      <Link
        href={tile.target}
        className="group grid h-full bg-cream/70 @xl:min-h-[30rem] @xl:grid-cols-2 @6xl:grid-cols-[1.35fr_1fr] focus-visible:outline-offset-4"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-sand @xl:aspect-auto @xl:min-h-full">
          <Image
            src={tile.image}
            alt=""
            fill
            sizes="(min-width: 1024px) 50vw, (min-width: 640px) 46vw, 92vw"
            className="object-cover transition-transform duration-[1.6s] ease-out-soft group-hover:scale-[1.03]"
          />
        </div>
        <div className="flex flex-col justify-between gap-10 p-7 sm:p-9 @xl:p-10 @3xl:p-14">
          <Eyebrow>{tile.eyebrow}</Eyebrow>
          <div className="space-y-5">
            <Heading as="p" level="h3" className="@3xl:text-[2.4rem]">
              {tile.heading}
            </Heading>
            <p className="max-w-sm text-sm leading-relaxed text-ink/75">{tile.text}</p>
            <span className="inline-flex items-center gap-3 border-b border-ink/30 pb-1 text-sm transition-colors group-hover:border-ink">
              {tile.cta}
              <span
                aria-hidden
                className="transition-transform duration-500 ease-out-soft group-hover:translate-x-1"
              >
                →
              </span>
            </span>
          </div>
        </div>
      </Link>
    </aside>
  );
}
