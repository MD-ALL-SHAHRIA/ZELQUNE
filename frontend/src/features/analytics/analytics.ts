import { env } from '@/config/env';

type PixelEvent = 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase';

declare global {
  interface Window {
    fbq?: (command: 'track', event: PixelEvent, params?: Record<string, unknown>) => void;
  }
}

/** Meta Pixel event; a no-op unless NEXT_PUBLIC_META_PIXEL_ID is set (the script never loads). */
export function pixel(event: PixelEvent, params?: Record<string, unknown>): void {
  if (!env.NEXT_PUBLIC_META_PIXEL_ID) return;
  window.fbq?.('track', event, params);
}

export const toTaka = (paisa: number) => Math.round(paisa) / 100;
