import Image from 'next/image';
import Link from 'next/link';
import { productImages } from '@/features/catalog/product-images';
import { productName } from '@/features/catalog/product-copy';
import { type Locale } from '@/i18n/config';
import { type Dictionary } from '@/i18n/dictionaries/en';
import { type ProductSummary } from '@/shared/api/types';
import { href } from '@/shared/lib/site';

/**
 * The collection, always quietly on the move: arch-framed pieces glide sideways under the trust
 * strip (two identical runs, shifted by half). It holds still under the pointer or keyboard
 * focus, rests off screen (data-loop), and with reduced motion becomes a row you scroll yourself.
 */
export function GlideStrip({
  products,
  lang,
  dict,
}: {
  products: ProductSummary[];
  lang: Locale;
  dict: Dictionary;
}) {
  const pieces = products.slice(0, 10).flatMap((p) => {
    const name = productName(p, lang, dict);
    const [image] = productImages(p.primaryMedia ? [p.primaryMedia] : [], name, lang, p.slug);
    return image ? [{ slug: p.slug, name, image }] : [];
  });
  if (pieces.length < 4) return null;
  const run = (copy: boolean) => (
    <ul aria-hidden={copy || undefined} className="flex shrink-0 gap-5 pr-5 sm:gap-8 sm:pr-8">
      {pieces.map((p) => (
        <li key={p.slug} className="glide-item w-[9.5rem] shrink-0 sm:w-[13rem]">
          <Link
            href={href(lang, `/products/${p.slug}`)}
            tabIndex={copy ? -1 : undefined}
            className="group block"
          >
            <span className="relative block aspect-[3/4] overflow-hidden rounded-t-full bg-sand">
              <Image
                src={p.image.src}
                alt={copy ? '' : p.image.alt}
                fill
                sizes="(min-width: 640px) 13rem, 9.5rem"
                className="object-cover transition-transform duration-700 ease-out-expo group-hover:scale-[1.06]"
              />
            </span>
            <span className="mt-3 block text-center font-display text-lg leading-tight text-ink/85 transition-colors group-hover:text-ink">
              {p.name}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
  return (
    <section
      aria-label={dict.shop.title}
      data-loop
      className="glide overflow-hidden py-14 sm:py-20"
    >
      <div className="loop-run flex w-max">
        {run(false)}
        {run(true)}
      </div>
    </section>
  );
}
