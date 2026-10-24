'use client';

import { createApiClient, type Schemas } from '@zelqune/api-client';

export type { Schemas };

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

/**
 * The access token lives in memory only; the refresh token is an httpOnly cookie the gateway
 * sets on /v1/admin/auth (SameSite=Strict). A 401 triggers one refresh, then the request is
 * retried once; if refresh fails the session is over.
 */
let accessToken: string | null = null;
let onSignedOut: (() => void) | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}
export function onSessionEnded(fn: () => void) {
  onSignedOut = fn;
}

let refreshing: Promise<boolean> | null = null;
export function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${baseUrl}/v1/admin/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  })
    .then(async (res) => {
      if (!res.ok) return false;
      const body = (await res.json()) as Schemas['AccessTokenResponseDto_Output'];
      accessToken = body.accessToken;
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function authFetch(input: Request): Promise<Response> {
  const send = (req: Request) => {
    const headers = new Headers(req.headers);
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
    return fetch(new Request(req, { headers, credentials: 'include' }));
  };
  const retry = input.clone();
  const res = await send(input);
  if (res.status !== 401 || input.url.includes('/v1/admin/auth/')) return res;
  if (await refreshSession()) return send(retry);
  accessToken = null;
  onSignedOut?.();
  return res;
}

export const api = createApiClient(baseUrl, { fetch: authFetch });

/** The gateway's error envelope: `{ error: { code, message } }`. */
export function errorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const e = (error as { error?: { message?: string; code?: string } } | undefined)?.error;
  return e?.message ?? fallback;
}
export function errorCode(error: unknown): string | undefined {
  return (error as { error?: { code?: string } } | undefined)?.error?.code;
}
