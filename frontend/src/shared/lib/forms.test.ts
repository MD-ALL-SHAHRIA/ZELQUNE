import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api/types';
import { checkoutErrorText, normalizePhone, normalizeTrxId } from './forms';

const copy = {
  phone: 'phone',
  trxUsed: 'trxUsed',
  outOfStock: 'outOfStock',
  generic: 'generic',
  turnstile: 'turnstile',
  priceChanged: 'priceChanged',
  rateLimited: 'rateLimited',
  trxRequired: 'trxRequired',
};

describe('forms', () => {
  it('accepts Bangladeshi mobiles in every common format, including Bangla digits', () => {
    for (const input of [
      '01712345678',
      '+8801712345678',
      '8801712345678',
      '017-1234 5678',
      '০১৭১২৩৪৫৬৭৮',
    ]) {
      expect(normalizePhone(input)).toBe('01712345678');
    }
    expect(normalizePhone('01212345678')).toBeNull();
    expect(normalizePhone('0171234567')).toBeNull();
  });

  it('normalises Transaction IDs like the gateway', () => {
    expect(normalizeTrxId(' 9ab1-c2d3 ef ')).toBe('9AB1C2D3EF');
    expect(normalizeTrxId('abc')).toBeNull();
  });

  it('maps gateway error codes to the copy', () => {
    expect(checkoutErrorText(new ApiError(409, 'TRX_ID_ALREADY_USED', ''), copy)).toBe('trxUsed');
    expect(checkoutErrorText(new ApiError(409, 'OUT_OF_STOCK', ''), copy)).toBe('outOfStock');
    expect(checkoutErrorText(new ApiError(429, 'TOO_MANY_REQUESTS', ''), copy)).toBe('rateLimited');
    expect(
      checkoutErrorText(
        ApiError.from(400, {
          error: { code: 'VALIDATION_FAILED', details: [{ path: ['customer', 'phone'] }] },
        }),
        copy,
      ),
    ).toBe('phone');
    expect(checkoutErrorText(new TypeError('fetch failed'), copy)).toBe('generic');
  });
});
