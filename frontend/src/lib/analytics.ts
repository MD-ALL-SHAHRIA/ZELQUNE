import { api, visitor } from './api-browser';

/** Anonymous funnel events for analytics-service (no personal data; session id is random). */
export function sendEvent(
  type: 'VIEW' | 'ADD_TO_CART',
  ids: { productId?: string; variantId?: string } = {},
): void {
  const { sessionId, p, utm } = visitor();
  if (!sessionId) return;
  void api
    .POST('/v1/events', {
      body: {
        type,
        sessionId,
        ...ids,
        ...(p ? { p } : {}),
        path: location.pathname.slice(0, 300),
        ...(utm ? { utm } : {}),
      },
      // Survives navigation (e.g. "Pre-order now" leaving the page right away).
      keepalive: true,
    })
    .catch(() => undefined);
}

type PixelEvent = 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase';

declare global {
  interface Window {
    fbq?: (command: 'track', event: PixelEvent, params?: Record<string, unknown>) => void;
  }
}

/** Meta Pixel event; a no-op unless NEXT_PUBLIC_META_PIXEL_ID is set (the script never loads). */
export function pixel(event: PixelEvent, params?: Record<string, unknown>): void {
  if (!process.env.NEXT_PUBLIC_META_PIXEL_ID) return;
  window.fbq?.('track', event, params);
}

export const toTaka = (paisa: number) => Math.round(paisa) / 100;
