import { type Locale } from '@/i18n/config';
import { DEFAULT_LEAD_DAYS } from './product-copy';

type SaleMode = 'IN_STOCK' | 'PRE_ORDER' | 'MADE_TO_ORDER';
type Zone = 'DHAKA' | 'SUBURB' | 'OUTSIDE';

/**
 * The latest day an order placed today should arrive, from the promises in the FAQ: built and
 * shipped within the lead time (pre-order / made to order), then the courier takes up to 2 days
 * in Dhaka and up to 4 outside. Without a district the longer courier time is used, so the date
 * is never earlier than what we promise.
 */
export function arrivalDate(
  now: Date,
  saleMode: SaleMode,
  leadTimeDays: number | null | undefined,
  zone: Zone | null,
): Date {
  const making = saleMode === 'IN_STOCK' ? 0 : leadTimeDays || DEFAULT_LEAD_DAYS;
  const courier = zone === 'DHAKA' ? 2 : 4;
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + making + courier);
  return d;
}

/** "20 November" / "২০ নভেম্বর", in Dhaka time. */
export function formatArrival(date: Date, lang: Locale): string {
  return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Dhaka',
  }).format(date);
}
