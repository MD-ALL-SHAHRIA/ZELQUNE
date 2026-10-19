import { Picture } from '@/shared/ui/image';
import { cn } from '@/shared/lib/cn';
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
 * scroll-snap strip on mobile (the next photo peeks in), an editorial stack on desktop: the first
 * image large and arch-framed, the rest in pairs, all on the soft neutral field.
 */
export function ProductGallery({ images, note }: { images: ProductImage[]; note: string }) {
  const [first] = images;
  if (!first) return null;
  const rest = images.length - 1;
  return (
    <div>
      <div className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 md:-mx-10 md:px-10 lg:mx-0 lg:grid lg:grid-cols-2 lg:gap-3 lg:overflow-visible lg:px-0">
        {images.map((img, i) => (
          <div
            key={img.src}
            className={cn(
              'w-[84vw] shrink-0 snap-center md:w-[60vw] lg:w-auto',
              (i === 0 || (i === images.length - 1 && rest % 2 === 1)) && 'lg:col-span-2',
            )}
          >
            <Picture
              src={img.src}
              alt={img.alt}
              sizes={
                i === 0 || (i === images.length - 1 && rest % 2 === 1)
                  ? '(min-width: 1440px) 820px, (min-width: 1024px) 56vw, 84vw'
                  : '(min-width: 1440px) 410px, (min-width: 1024px) 28vw, 84vw'
              }
              priority={i === 0}
              arch={i === 0}
              ratio={
                i === 0
                  ? 'aspect-[4/5]'
                  : rest % 2 === 1 && i === images.length - 1
                    ? 'aspect-[16/10]'
                    : 'aspect-[4/5]'
              }
            />
          </div>
        ))}
      </div>
      {first.sample ? <p className="mt-3 text-[0.7rem] text-stone">{note}</p> : null}
    </div>
  );
}
