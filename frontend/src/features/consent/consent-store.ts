import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE,
  type Consent,
  parseConsent,
  serializeConsent,
} from '@/shared/lib/consent';
import { deleteCookie, readCookie, writeCookie } from '@/shared/lib/cookies';
import { COOKIE, SESSION_MAX_AGE } from '@/shared/lib/visitor';

/**
 * The visitor's cookie choice in the browser: read it, change it, and tell the page. Saving it
 * starts or stops analytics on the spot (the session cookie is what turns our own funnel events
 * on; see features/analytics/listeners.ts), and the next request tells proxy.ts as well.
 */
const listeners = new Set<() => void>();

export function subscribeConsent(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Snapshot for useSyncExternalStore: the raw cookie ("" = no choice yet). */
export function consentSnapshot(): string {
  return readCookie(CONSENT_COOKIE) ?? '';
}

/** On the server nothing is known yet: the banner waits for the browser. */
export const SERVER_SNAPSHOT = 'server';

export function readConsent(): Consent | null {
  return parseConsent(readCookie(CONSENT_COOKIE));
}

export function saveConsent(next: Consent): void {
  const before = readConsent();
  writeCookie(CONSENT_COOKIE, serializeConsent(next), CONSENT_MAX_AGE);
  if (next.analytics) {
    if (!readCookie(COOKIE.session)) {
      writeCookie(COOKIE.session, crypto.randomUUID().replaceAll('-', ''), SESSION_MAX_AGE);
    }
  } else {
    deleteCookie(COOKIE.session);
    deleteCookie(COOKIE.utm);
  }
  listeners.forEach((l) => l());
  // A Pixel that already loaded cannot be unloaded: reload so it is gone.
  if (before?.marketing && !next.marketing && typeof window.fbq === 'function') location.reload();
}

/** Opens the settings dialog from anywhere (the footer link). */
export const OPEN_SETTINGS_EVENT = 'zq:cookie-settings';
export function openCookieSettings(): void {
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
}
