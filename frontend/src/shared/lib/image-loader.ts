'use client';

import type { ImageLoaderProps } from 'next/image';

/**
 * Global next/image loader. Unsplash sample photos are resized by Unsplash's own image CDN
 * (WebP/AVIF via auto=format), so our server never proxies large originals; everything else
 * (catalog media) goes through Next's optimizer as usual.
 */
export default function imageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (src.startsWith('https://images.unsplash.com/')) {
    const url = new URL(src);
    url.searchParams.set('w', String(width));
    url.searchParams.set('q', String(quality ?? 72));
    url.searchParams.set('auto', 'format');
    url.searchParams.set('fit', 'crop');
    return url.toString();
  }
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality ?? 75}`;
}
