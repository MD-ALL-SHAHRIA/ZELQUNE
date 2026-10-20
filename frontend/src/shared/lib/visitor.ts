/** First-party cookies the storefront sets (readable by our own JS; no third parties). */
export const COOKIE = {
  /** Price experiment arm, sticky: the first `?p=a|b` wins for 90 days. */
  experiment: 'zq_p',
  /** Anonymous analytics session id (random; no personal data). */
  session: 'zq_sid',
  /** First-touch UTM parameters (JSON). */
  utm: 'zq_utm',
  /** Guest cart token from POST /v1/carts. */
  cart: 'zq_cart',
} as const;

export const DAY_SECONDS = 86_400;
export const EXPERIMENT_MAX_AGE = 90 * DAY_SECONDS;
export const SESSION_MAX_AGE = 365 * DAY_SECONDS;
export const UTM_MAX_AGE = 30 * DAY_SECONDS;

export const EXPERIMENT_KEYS = ['a', 'b'] as const;
export type ExperimentKey = (typeof EXPERIMENT_KEYS)[number];
/** Hidden route segment the proxy rewrites to, so each arm is its own static page. */
export const PRICE_SEGMENTS = ['base', 'a', 'b'] as const;
export type PriceSegment = (typeof PRICE_SEGMENTS)[number];

export function isExperimentKey(value: string | null | undefined): value is ExperimentKey {
  return value === 'a' || value === 'b';
}

export function isPriceSegment(value: string | undefined): value is PriceSegment {
  return value === 'base' || isExperimentKey(value);
}

/** Matches the gateway's beacon/checkout sessionId rule. */
export const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export const UTM_KEYS = ['source', 'medium', 'campaign', 'content', 'term'] as const;
export type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>;

export function parseUtm(raw: string | undefined): Utm | undefined {
  if (!raw) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return undefined;
    const utm: Utm = {};
    for (const key of UTM_KEYS) {
      const v = (value as Record<string, unknown>)[key];
      if (typeof v === 'string' && v) utm[key] = v.slice(0, 120);
    }
    return Object.keys(utm).length ? utm : undefined;
  } catch {
    return undefined;
  }
}
