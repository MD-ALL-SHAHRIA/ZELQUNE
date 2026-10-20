import { readCookie } from './cookies';
import { COOKIE, isExperimentKey, parseUtm, SESSION_ID_PATTERN, type Utm } from './visitor';

/** Anonymous visitor context from the first-party cookies set by proxy.ts (browser only). */
export function visitor(): { sessionId?: string; p?: 'a' | 'b'; utm?: Utm } {
  const sessionId = readCookie(COOKIE.session);
  const p = readCookie(COOKIE.experiment);
  return {
    sessionId: sessionId && SESSION_ID_PATTERN.test(sessionId) ? sessionId : undefined,
    p: isExperimentKey(p) ? p : undefined,
    utm: parseUtm(readCookie(COOKIE.utm)),
  };
}
