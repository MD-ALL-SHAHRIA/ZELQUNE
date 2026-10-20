import Image from 'next/image';
import { Text } from './text';

/**
 * A product photo (next/image, WebP, responsive) or, until real prototype photos exist,
 * a clearly labelled placeholder. Never a stock or someone else's photo.
 */
export function Photo({
  src,
  alt,
  placeholder,
  sizes,
  priority = false,
}: {
  src: string | null | undefined;
  alt: string;
  placeholder: string;
  sizes: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-line">
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={alt}
      className="flex aspect-[4/5] items-center justify-center rounded-lg bg-gradient-to-b from-walnut to-ink p-6 text-center text-sm text-cream"
    >
      <span className="space-y-3">
        <svg viewBox="0 0 64 96" aria-hidden className="mx-auto h-20 w-auto opacity-80">
          <path d="M4 92V32a28 28 0 0 1 56 0v60z" fill="none" stroke="#E3A857" strokeWidth="3" />
          <path d="M20 84V44M32 84V36M44 84V44" stroke="#F4ECDF" strokeWidth="3" />
        </svg>
        <span className="block">
          <Text>{placeholder}</Text>
        </span>
      </span>
    </div>
  );
}
