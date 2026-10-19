import { AppError } from '@zelqune/common';
import { type CookieOptions, type Request, type Response } from 'express';
import { type GatewayEnv } from '../config/gateway-env';

/** Cookie is only ever sent to the auth endpoints. */
export const REFRESH_COOKIE_PATH = '/v1/admin/auth';

type CookieConfig = Pick<GatewayEnv, 'REFRESH_COOKIE_NAME' | 'COOKIE_SECURE' | 'COOKIE_DOMAIN'>;

function baseOptions(config: CookieConfig): CookieOptions {
  return {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: 'strict',
    path: REFRESH_COOKIE_PATH,
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
  };
}

export function setRefreshCookie(
  res: Response,
  config: CookieConfig,
  token: string,
  expiresAt: Date,
): void {
  res.cookie(config.REFRESH_COOKIE_NAME, token, { ...baseOptions(config), expires: expiresAt });
}

export function clearRefreshCookie(res: Response, config: CookieConfig): void {
  res.clearCookie(config.REFRESH_COOKIE_NAME, baseOptions(config));
}

export function readRefreshCookie(req: Request, config: CookieConfig): string | undefined {
  const value = (req.cookies as Record<string, unknown> | undefined)?.[config.REFRESH_COOKIE_NAME];
  return typeof value === 'string' && value.length > 0 && value.length <= 256 ? value : undefined;
}

/**
 * CSRF defence in depth for cookie-authenticated endpoints (on top of SameSite=Strict):
 * a browser request must come from an allowed origin. Non-browser clients send no Origin.
 */
export function assertAllowedOrigin(req: Request, allowed: string[]): void {
  const origin = req.headers.origin;
  if (origin !== undefined && !allowed.includes(origin)) {
    throw new AppError('ORIGIN_NOT_ALLOWED', 'Origin not allowed', 403);
  }
}
