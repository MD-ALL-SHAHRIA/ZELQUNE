import { type Locale, LOCALES } from '@/i18n/config';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100').replace(
  /\/$/,
  '',
);

/** Public URL of a page in one language (the hidden price segment never appears in links). */
export function href(lang: Locale, path = ''): string {
  return `/${lang}${path === '/' ? '' : path}`;
}

/** hreflang alternates for metadata. */
export function alternates(lang: Locale, path = '') {
  return {
    canonical: href(lang, path),
    languages: Object.fromEntries(LOCALES.map((l) => [l, href(l, path)])),
  };
}
