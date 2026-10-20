import { type Locale } from '@/i18n/config';
import { formatNumber } from '@/i18n/format';

/** Two-digit editorial numeral ("01", "০১") in the page's own digits. */
export function numeral(n: number, lang: Locale): string {
  return formatNumber(n, lang).padStart(2, lang === 'bn' ? '০' : '0');
}
