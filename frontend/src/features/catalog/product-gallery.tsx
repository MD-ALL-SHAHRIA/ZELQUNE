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
 * Product page gallery: on mobile a swipeable strip (scroll-snap, no JS); on desktop an
 * editorial stack, first image arch-framed, the rest in a two-column grid.
 */
export function ProductGallery({ images, note }: { images: ProductImage[]; note: string }) {
  const [first, ...rest] = images;
  if (!first) return null;
  return (
    <div>
      <div className="scrollbar-none -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 lg:hidden">
        {images.map((img, i) => (
          <div key={img.src} className="w-[86vw] shrink-0 snap-center">
            <Picture src={img.src} alt={img.alt} sizes="86vw" priority={i === 0} arch={i === 0} />
          </div>
        ))}
      </div>
      <div className="hidden gap-4 lg:grid">
        <Picture src={first.src} alt={first.alt} sizes="50vw" priority arch />
        <div className={cn('grid gap-4', rest.length > 1 && 'grid-cols-2')}>
          {rest.map((img) => (
            <Picture key={img.src} src={img.src} alt={img.alt} sizes="25vw" ratio="aspect-[3/4]" />
          ))}
        </div>
      </div>
      {first.sample ? <p className="mt-3 text-[0.7rem] text-stone">{note}</p> : null}
    </div>
  );
}
