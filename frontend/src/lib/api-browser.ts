import { createApiClient } from '@zelqune/api-client';
export { ok } from './api-types';
import { readCookie } from './cookies';
import { COOKIE, isExperimentKey, parseUtm, SESSION_ID_PATTERN, type Utm } from './visitor';

/** The browser talks to the gateway directly (CORS), so rate limits see the visitor's IP. */
export const api = createApiClient(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000');

export function visitor(): { sessionId?: string; p?: 'a' | 'b'; utm?: Utm } {
  const sessionId = readCookie(COOKIE.session);
  const p = readCookie(COOKIE.experiment);
  return {
    sessionId: sessionId && SESSION_ID_PATTERN.test(sessionId) ? sessionId : undefined,
    p: isExperimentKey(p) ? p : undefined,
    utm: parseUtm(readCookie(COOKIE.utm)),
  };
}
