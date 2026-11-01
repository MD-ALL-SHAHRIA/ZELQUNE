import { ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { productName } from '@/features/catalog/product-copy';
import { SAMPLE } from '@/content/sample-images';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatTaka } from '@/i18n/format';
import { type ProductSummary } from '@/shared/api/types';
import { href } from '@/shared/lib/site';
import { Container, Eyebrow, Heading, Lead } from '@/shared/ui/typography';
import { RoomHotspots, type RoomSpot } from './room-hotspots';
import { SplitText } from '@/shared/ui/split-text';

/** Where each piece would sit in the room photo (percent of width / height). */
const ROOM = {
  image: SAMPLE.livingShelves,
  spots: [
    { slug: 'diamond-shelf-pair', x: 58, y: 27 },
    { slug: 'half-moon-planter-light', x: 79, y: 41 },
    { slug: 'capsule-vase-light', x: 43, y: 51 },
    { slug: 'fluted-niche-panel', x: 66, y: 63 },
  ],
} as const;

const PULSE_CSS =
  '@keyframes room-pulse{0%{transform:scale(.7);opacity:.9}70%,100%{transform:scale(1.9);opacity:0}}';

/**
 * Shop the room: one large room photo with a marker on each piece. Markers open a small card
 * (name, price "from", link); the same pieces are listed beside the photo on desktop and as a
 * swipeable row under it on phones. Pieces missing from the catalog are skipped.
 */
export function ShopTheRoom({
  products,
  lang,
  dict,
}: {
  products: ProductSummary[];
  lang: Locale;
  dict: Dictionary;
}) {
  const t = dict.premium.shopRoom;
  const spots: RoomSpot[] = ROOM.spots.flatMap((spot) => {
    const product = products.find((p) => p.slug === spot.slug);
    if (!product) return [];
    return [
      {
        ...spot,
        name: productName(product, lang, dict),
        price: product.fromPrice
          ? fill(dict.ui.from, { price: formatTaka(product.fromPrice.amountPaisa, lang) })
          : null,
        href: href(lang, `/products/${product.slug}`),
      },
    ];
  });
  if (!spots.length) return null;

  return (
    <section aria-labelledby="room-heading" className="bg-cream py-20 sm:py-28 lg:py-36">
      <style>{PULSE_CSS}</style>
      <Container className="grid gap-10 lg:grid-cols-12 lg:gap-x-8 lg:gap-y-0">
        <div className="reveal space-y-6 lg:col-span-4 lg:col-start-1 lg:row-start-1 lg:pt-6">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <Heading id="room-heading" level="h1">
            <SplitText text={t.heading} />
          </Heading>
          <Lead className="max-w-sm">{t.text}</Lead>
        </div>

        {/* The room. Full bleed on phones, a tall framed photograph on desktop. */}
        <figure className="reveal -mx-5 md:mx-0 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
          <div className="relative aspect-[4/5] bg-sand lg:mx-auto lg:w-[min(100%,720px,calc(86svh*0.8))]">
            <div className="media-reveal absolute inset-0 overflow-hidden">
              <Image
                src={ROOM.image.src}
                alt=""
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            <RoomHotspots spots={spots} view={t.view} />
          </div>
          <figcaption className="mt-3 px-5 text-[0.7rem] text-stone md:px-0 lg:mx-auto lg:w-[min(100%,720px,calc(86svh*0.8))]">
            {dict.landing.sampleNote}
          </figcaption>
        </figure>

        {/* The same pieces as a list: a swipeable row on phones, an index on desktop. */}
        <ul className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-5 px-5 md:-mx-10 md:scroll-pl-10 md:px-10 lg:col-span-4 lg:col-start-1 lg:row-start-2 lg:mx-0 lg:flex-col lg:gap-0 lg:self-end lg:overflow-visible lg:border-t lg:border-ink/15 lg:px-0">
          {spots.map((s) => (
            <li
              key={s.slug}
              className="w-[68vw] max-w-[280px] shrink-0 snap-start lg:w-auto lg:max-w-none lg:border-b lg:border-ink/15"
            >
              <Link
                href={s.href}
                className="group flex h-full items-start gap-4 bg-paper p-5 transition-colors duration-500 ease-out-soft hover:bg-paper/70 lg:items-center lg:bg-transparent lg:px-0 lg:py-5 lg:hover:bg-transparent"
              >
                <span
                  aria-hidden
                  className="mt-2.5 size-1.5 shrink-0 rounded-full bg-amber lg:mt-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-xl font-medium leading-tight sm:text-2xl">
                    {s.name}
                  </span>
                  {s.price ? (
                    <span className="mt-1 block text-sm text-stone">{s.price}</span>
                  ) : null}
                </span>
                <ArrowRight
                  aria-hidden
                  strokeWidth={1.1}
                  className="mt-1 size-5 shrink-0 text-ink/60 transition-transform duration-500 ease-out-soft group-hover:translate-x-1 lg:mt-0"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
