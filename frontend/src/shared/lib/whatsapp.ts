import { env } from '@/config/env';

/**
 * wa.me link to the business WhatsApp with a prefilled message, or null when no number is
 * configured (dashboard contact, else NEXT_PUBLIC_WHATSAPP_NUMBER): callers then render no button.
 */
export function whatsappHref(message: string, override?: string | null): string | null {
  // The owner's number from the dashboard wins over the env default.
  const number = override || env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
