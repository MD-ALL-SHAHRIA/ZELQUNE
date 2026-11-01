'use client';

import { env } from '@/config/env';
import { type Schemas } from '@zelqune/api-client';

export type Customer = Schemas['CustomerDto_Output'];
type State =
  { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; customer: Customer };

/**
 * The customer's session in the browser (ADR 0021). The access token lives in memory only; the
 * refresh token is an HttpOnly cookie the gateway sets for /v1/auth. On load the page asks for
 * a fresh access token once; a 401 later triggers one refresh and one retry.
 */
const API = env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
let token: string | null = null;
let state: State = { status: 'loading' };
let started = false;
const listeners = new Set<() => void>();
const set = (next: State) => {
  state = next;
  listeners.forEach((l) => l());
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}, auth = false): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (auth && token) headers.set('authorization', `Bearer ${token}`);
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...init, headers, credentials: 'include' });
  } catch {
    throw new ApiError(0, 'NETWORK', 'network');
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string; details?: unknown };
  };
  if (!res.ok)
    throw new ApiError(
      res.status,
      body.error?.code ?? 'ERROR',
      body.error?.message ?? 'error',
      body.error?.details,
    );
  return body as T;
}

type TokenReply = { accessToken: string };

let refreshing: Promise<boolean> | null = null;
export function refresh(): Promise<boolean> {
  refreshing ??= call<TokenReply>('/v1/auth/refresh', { method: 'POST' })
    .then((r) => {
      token = r.accessToken;
      return true;
    })
    .catch(() => {
      token = null;
      return false;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** Signed-in request: refreshes once on 401, then signs out if that fails too. */
export async function authed<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!token && !(await refresh())) {
    set({ status: 'signedOut' });
    throw new ApiError(401, 'SIGNED_OUT', 'signed out');
  }
  try {
    return await call<T>(path, init, true);
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;
    if (!(await refresh())) {
      set({ status: 'signedOut' });
      throw err;
    }
    return call<T>(path, init, true);
  }
}

export const publicCall = call;

/** The current access token for other API clients (waits for a refresh already in flight). */
export async function currentToken(): Promise<string | null> {
  if (!token && refreshing) await refreshing;
  return token;
}

async function loadMe(): Promise<void> {
  try {
    set({ status: 'signedIn', customer: await authed<Customer>('/v1/auth/me') });
  } catch {
    set({ status: 'signedOut' });
  }
}

/** After any sign-in: keep the token, load the profile. */
export async function signedIn(reply: TokenReply): Promise<void> {
  token = reply.accessToken;
  await loadMe();
}

/** The session cookie is fresh (e.g. back from Google): load the profile. */
export function reloadProfile(): Promise<void> {
  return loadMe();
}

export async function signOut(): Promise<void> {
  await call('/v1/auth/logout', { method: 'POST' }).catch(() => undefined);
  token = null;
  set({ status: 'signedOut' });
}

export function setCustomer(customer: Customer): void {
  set({ status: 'signedIn', customer });
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  if (!started) {
    started = true;
    void refresh().then((ok) => (ok ? loadMe() : set({ status: 'signedOut' })));
  }
  return () => listeners.delete(fn);
}
export const snapshot = () => state;
export const SERVER_STATE: State = { status: 'loading' };

/** Where Google/Facebook sign-in starts (a full-page navigation to the API). */
export function oauthUrl(provider: 'google' | 'facebook', lang: string, returnTo: string): string {
  const q = new URLSearchParams({ lang, returnTo });
  return `${API}/v1/auth/oauth/${provider}/start?${q.toString()}`;
}
