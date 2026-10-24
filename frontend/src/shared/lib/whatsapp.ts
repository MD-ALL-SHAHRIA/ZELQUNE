import { env } from '@/config/env';

/**
 * wa.me link to the business WhatsApp with a prefilled message, or null when no number is
 * configured (NEXT_PUBLIC_WHATSAPP_NUMBER), in which case callers render no chat button.
 */
export function whatsappHref(message: string): string | null {
  const number = env.NEXT_PUBLIC_WHATSAPP_NUMBER;
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
