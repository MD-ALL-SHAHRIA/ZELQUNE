import { createHmac } from 'node:crypto';

/**
 * Pseudonymous customer identifier for analytics: HMAC-SHA256 of the E.164 phone with a
 * secret only order-service holds. A plain hash of a Bangladeshi mobile number could be
 * reversed by brute force (~10^9 numbers); the HMAC cannot without the secret (ADR 0010).
 */
export function customerKey(secret: string, phone: string): string {
  return createHmac('sha256', secret).update(phone).digest('hex').slice(0, 32);
}
