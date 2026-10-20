import Image from 'next/image';
import { cn } from '@/shared/lib/cn';

/**
 * Editorial image: next/image (responsive, WebP), optional arch mask (the brand motif) and an
 * optional "sample photo" note while real product photos don't exist yet.
 */
export function Picture({
  src,
  alt,
  sizes,
  priority = false,
  arch = false,
  ratio = 'aspect-[4/5]',
  className,
  note,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  arch?: boolean;
  ratio?: string;
  className?: string;
  note?: string;
}) {
  return (
    <figure className={cn('relative', className)}>
      <div className={cn('relative overflow-hidden bg-sand', ratio, arch && 'rounded-t-[999px]')}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-[1.6s] ease-out-soft group-hover:scale-[1.03]"
        />
      </div>
      {note ? (
        <figcaption className="mt-2 text-[0.7rem] tracking-wide text-stone">{note}</figcaption>
      ) : null}
    </figure>
  );
}
