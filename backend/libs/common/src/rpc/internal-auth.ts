import { createHash, timingSafeEqual } from 'node:crypto';

/** Code returned to a TCP caller that did not present the shared internal secret. */
export const INTERNAL_AUTH_FAILED = 'INTERNAL_AUTH_FAILED';

/**
 * Shared secret on every gateway/saga -> service TCP call (defence in depth on top of the
 * private network). Required in production; outside production it is enforced when set.
 */
export function internalRpcSecret(env: {
  NODE_ENV?: string;
  INTERNAL_RPC_SECRET?: string;
}): string | undefined {
  if (env.NODE_ENV === 'production' && !env.INTERNAL_RPC_SECRET)
    throw new Error('INTERNAL_RPC_SECRET is required in production (32+ characters)');
  return env.INTERNAL_RPC_SECRET || undefined;
}

/** Constant-time comparison (hashing first makes the lengths equal). */
export function internalSecretMatches(expected: string, presented: unknown): boolean {
  if (typeof presented !== 'string') return false;
  const a = createHash('sha256').update(expected).digest();
  const b = createHash('sha256').update(presented).digest();
  return timingSafeEqual(a, b);
}
