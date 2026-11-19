/**
 * The URL next/image would use for `src` at `width` (one of next.config's image sizes). Same
 * origin, so a canvas that draws it stays readable.
 */
export function optimizedImage(src: string, width: number, quality = 75): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}
