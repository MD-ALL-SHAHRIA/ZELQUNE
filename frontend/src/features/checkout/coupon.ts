import { type Dictionary } from '@/i18n/dictionaries/en';
import { fill, formatTaka } from '@/i18n/format';
import { type Locale } from '@/i18n/config';

type Reasons = Dictionary['offers']['coupon']['reasons'];

/**
 * The customer-facing reason a coupon was refused (gateway COUPON_INVALID with details.reason),
 * or null when the error is about something else.
 */
export function couponProblem(error: unknown, copy: Reasons, lang: Locale): string | null {
  const body = (error as { data?: { error?: { code?: string; details?: unknown } } } | null)?.data
    ?.error;
  if (body?.code !== 'COUPON_INVALID') return null;
  const details = (body.details ?? {}) as { reason?: string; minSubtotalPaisa?: number };
  const reason = (details.reason ?? 'NOT_FOUND') as keyof Reasons;
  const text = copy[reason] ?? copy.NOT_FOUND;
  return reason === 'MIN_SUBTOTAL' && details.minSubtotalPaisa
    ? fill(text, { amount: formatTaka(details.minSubtotalPaisa, lang) })
    : text;
}

/** What customers type: trimmed and upper-cased (codes match in any case). */
export const normalizeCoupon = (raw: string) => raw.trim().toUpperCase().replace(/\s+/g, '');
