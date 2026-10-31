import { describe, expect, it } from 'vitest';
import { CONSENT_VERSION, parseConsent, serializeConsent } from './consent';

describe('consent cookie format', () => {
  it('round-trips every combination', () => {
    for (const analytics of [true, false])
      for (const marketing of [true, false])
        expect(parseConsent(serializeConsent({ analytics, marketing }))).toEqual({
          analytics,
          marketing,
        });
  });

  it('means "no choice" for missing, malformed or outdated values', () => {
    expect(parseConsent(undefined)).toBeNull();
    expect(parseConsent('yes')).toBeNull();
    expect(parseConsent(`v${CONSENT_VERSION + 1}.a1.m1`)).toBeNull();
  });
});
