/**
 * The visitor's cookie choices (shared by proxy.ts and the browser). Necessary cookies (cart,
 * theme, security) need no consent; analytics (`zq_sid`, `zq_utm`, our own funnel events) and
 * marketing (Meta Pixel) run only after a "yes". No choice yet means "no".
 */
export const CONSENT_COOKIE = 'zq_consent';
/** Raise when the categories or their meaning change: every visitor is asked again. */
export const CONSENT_VERSION = 1;
/** Ask again after about six months. */
export const CONSENT_MAX_AGE = 180 * 86_400;

export interface Consent {
  analytics: boolean;
  marketing: boolean;
}

/** "v1.a1.m0": compact, readable, no personal data. */
export function serializeConsent(c: Consent): string {
  return `v${CONSENT_VERSION}.a${c.analytics ? 1 : 0}.m${c.marketing ? 1 : 0}`;
}

/** The stored choice, or null when there is none (or it is from an older version). */
export function parseConsent(raw: string | undefined | null): Consent | null {
  const m = /^v(\d+)\.a([01])\.m([01])$/.exec(raw ?? '');
  if (!m || Number(m[1]) !== CONSENT_VERSION) return null;
  return { analytics: m[2] === '1', marketing: m[3] === '1' };
}
