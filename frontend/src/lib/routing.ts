import { DEFAULT_LOCALE, isLocale } from '@/i18n/config';
import {
  COOKIE,
  EXPERIMENT_MAX_AGE,
  isExperimentKey,
  type PriceSegment,
  SESSION_ID_PATTERN,
  SESSION_MAX_AGE,
  UTM_KEYS,
  type Utm,
  UTM_MAX_AGE,
} from './visitor';

export interface CookieToSet {
  name: string;
  value: string;
  maxAge: number;
}

export type RouteDecision =
  | { kind: 'redirect'; location: string }
  | { kind: 'rewrite'; pathname: string; segment: PriceSegment; cookies: CookieToSet[] };

/**
 * Pure routing rules behind proxy.ts:
 * - no language prefix -> redirect to /en/...;
 * - the price arm comes from the zq_p cookie, else from ?p=a|b (then remembered for 90 days);
 *   no arm means the base price and no experiment;
 * - every visitor gets an anonymous session id and first-touch UTM is remembered;
 * - the page is served from the hidden /{lang}/{arm}/... segment, so each arm is static.
 */
export function decideRoute(
  url: URL,
  cookies: Record<string, string | undefined>,
  newSessionId: () => string,
): RouteDecision {
  const [, first, ...rest] = url.pathname.split('/');
  if (!isLocale(first)) {
    const path = url.pathname === '/' ? '' : url.pathname;
    return { kind: 'redirect', location: `/${DEFAULT_LOCALE}${path}${url.search}` };
  }

  const set: CookieToSet[] = [];
  let segment: PriceSegment = 'base';
  const remembered = cookies[COOKIE.experiment];
  const requested = url.searchParams.get('p');
  if (isExperimentKey(remembered)) {
    segment = remembered;
  } else if (isExperimentKey(requested)) {
    segment = requested;
    set.push({ name: COOKIE.experiment, value: requested, maxAge: EXPERIMENT_MAX_AGE });
  }

  if (!SESSION_ID_PATTERN.test(cookies[COOKIE.session] ?? '')) {
    set.push({ name: COOKIE.session, value: newSessionId(), maxAge: SESSION_MAX_AGE });
  }

  if (!cookies[COOKIE.utm]) {
    const utm: Utm = {};
    for (const key of UTM_KEYS) {
      const value = url.searchParams.get(`utm_${key}`);
      if (value) utm[key] = value.slice(0, 120);
    }
    if (Object.keys(utm).length) {
      set.push({ name: COOKIE.utm, value: JSON.stringify(utm), maxAge: UTM_MAX_AGE });
    }
  }

  const tail = rest.filter(Boolean).join('/');
  return {
    kind: 'rewrite',
    pathname: `/${first}/${segment}${tail ? `/${tail}` : ''}`,
    segment,
    cookies: set,
  };
}
