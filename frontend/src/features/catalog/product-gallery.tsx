import { type Locale } from '@/i18n/config';
import { fill, formatNumber } from '@/i18n/format';
import { cn } from '@/shared/lib/cn';
import { Picture } from '@/shared/ui/image';
import { GalleryShell } from './product-gallery.client';
import { type ProductImage } from './product-images';

/** One or more product images; the first can be arch-framed (the brand motif). */
export function ProductImages({
  images,
  arch = false,
  note,
  priority = false,
}: {
  images: ProductImage[];
  arch?: boolean;
  note?: string;
  priority?: boolean;
}) {
  return (
    <>
      {images.map((img, i) => (
        <Picture
          key={img.src}
          src={img.src}
          alt={img.alt}
          sizes="(min-width: 1024px) 45vw, 100vw"
          arch={arch && i === 0}
          priority={priority && i === 0}
          note={img.sample && i === 0 ? note : undefined}
        />
      ))}
    </>
  );
}

/**
 * Product page gallery, one set of images for every screen (each downloaded once): a swipeable
 * scroll-snap strip with a photo counter on phones (the next photo peeks in), an editorial stack
 * on desktop (the first image large and arch-framed, the rest in pairs). Every photo opens a
 * full-screen view on click; that view's code loads only then.
 */
export function ProductGallery({
  images,
  note,
  lang,
  photoCount,
  closeLabel,
  actions,
}: {
  images: ProductImage[];
  note: string;
  lang: Locale;
  /** "Photo {n} of {total}". */
  photoCount: string;
  closeLabel: string;
  /** Shown under the photos (e.g. "See it on your wall"). */
  actions?: React.ReactNode;
}) {
  const [first] = images;
  if (!first) return null;
  const rest = images.length - 1;
  const total = formatNumber(images.length, lang);
  const label = (i: number) =>
    `${images[i]?.alt ?? ''} · ${fill(photoCount, { n: formatNumber(i + 1, lang), total })}`;
  return (
    <GalleryShell
      images={images.map((img, i) => ({ src: img.src, alt: label(i) }))}
      numbers={images.map((_, i) => formatNumber(i + 1, lang))}
      total={total}
      closeLabel={closeLabel}
      footer={
        actions || first.sample ? (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            {actions}
            {first.sample ? (
              <p className="text-[0.7rem] text-stone lg:ml-auto lg:text-right">{note}</p>
            ) : null}
          </div>
        ) : null
      }
    >
      <div
        data-gallery-track
        className="scrollbar-none -mx-5 flex snap-x snap-mandatory scroll-px-5 gap-2 overflow-x-auto px-5 md:-mx-10 md:scroll-px-10 md:px-10 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:overflow-visible lg:px-0"
      >
        {images.map((img, i) => {
          const wide = i === 0 || (i === images.length - 1 && rest % 2 === 1);
          return (
            <button
              key={img.src}
              type="button"
              data-zoom={i}
              aria-label={label(i)}
              className={cn(
                'group block w-[84vw] shrink-0 cursor-zoom-in snap-start text-left md:w-[60vw] lg:w-auto',
                wide && 'lg:col-span-2',
              )}
            >
              <Picture
                src={img.src}
                alt={img.alt}
                sizes={
                  wide
                    ? '(min-width: 1440px) 820px, (min-width: 1024px) 56vw, 84vw'
                    : '(min-width: 1440px) 410px, (min-width: 1024px) 28vw, 84vw'
                }
                priority={i === 0}
                arch={i === 0}
                ratio={i > 0 && wide ? 'aspect-[4/5] lg:aspect-[16/10]' : 'aspect-[4/5]'}
              />
            </button>
          );
        })}
      </div>
    </GalleryShell>
  );
}
