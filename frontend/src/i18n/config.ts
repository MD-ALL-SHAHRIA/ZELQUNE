export const LOCALES = ['en', 'bn'] as const;
export type Locale = (typeof LOCALES)[number];
/** English is the default (owner's decision, step 1.4); the URL prefix decides the language. */
export const DEFAULT_LOCALE: Locale = 'en';

export function isLocale(value: string | undefined): value is Locale {
  return value === 'en' || value === 'bn';
}

/** BCP 47 tags for Intl (Bangladesh grouping: 1,00,000). */
export const INTL_LOCALE: Record<Locale, string> = { en: 'en-IN', bn: 'bn-BD' };
