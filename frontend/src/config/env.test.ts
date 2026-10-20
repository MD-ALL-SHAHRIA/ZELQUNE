import { describe, expect, it } from 'vitest';
import { validatePublicEnv } from './env.schema';

describe('public env validation', () => {
  it('accepts blanks (dev defaults) and valid values', () => {
    expect(() => validatePublicEnv({ NEXT_PUBLIC_META_PIXEL_ID: '' })).not.toThrow();
    expect(() =>
      validatePublicEnv({
        NEXT_PUBLIC_API_URL: 'https://api.zelqune.com',
        NEXT_PUBLIC_META_PIXEL_ID: '123',
      }),
    ).not.toThrow();
  });

  it('rejects a malformed API URL or Pixel ID', () => {
    expect(() => validatePublicEnv({ NEXT_PUBLIC_API_URL: 'not a url' })).toThrow();
    expect(() => validatePublicEnv({ NEXT_PUBLIC_META_PIXEL_ID: 'abc' })).toThrow();
  });
});
