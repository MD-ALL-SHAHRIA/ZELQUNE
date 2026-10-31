import { env } from '@/config/env';
import { readConsent } from '@/features/consent/consent-store';

type PixelEvent = 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase';

declare global {
  interface Window {
    fbq?: (command: 'track', event: PixelEvent, params?: Record<string, unknown>) => void;
  }
}

/**
 * Meta Pixel event: a no-op unless NEXT_PUBLIC_META_PIXEL_ID is set and the visitor accepted
 * marketing cookies (the script only loads then). Never send names, phones or addresses.
 */
export function pixel(event: PixelEvent, params?: Record<string, unknown>): void {
  if (!env.NEXT_PUBLIC_META_PIXEL_ID || !readConsent()?.marketing) return;
  window.fbq?.('track', event, params);
}

export const toTaka = (paisa: number) => Math.round(paisa) / 100;
