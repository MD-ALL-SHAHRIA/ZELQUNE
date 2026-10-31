import { type Locale } from '@/i18n/config';
import { type HomeContent } from '@/shared/api/content';

/**
 * The confirmed legal identity as one line ("Name, address (Trade licence X)"), or null while the
 * owner has not confirmed it: the public API then returns it empty, and the site never guesses.
 * Bangla falls back to English field by field.
 */
export function businessLine(
  business: HomeContent['business'] | null | undefined,
  lang: Locale,
  licenceLabel: string,
): string | null {
  if (!business?.confirmed) return null;
  const pick = (v: { en: string; bn: string }) => v[lang].trim() || v.en.trim();
  const name = pick(business.legalName);
  const address = pick(business.address);
  const licence = business.tradeLicence.trim();
  if (!name || !address || !licence) return null;
  return `${name}, ${address} (${licenceLabel} ${licence})`;
}
