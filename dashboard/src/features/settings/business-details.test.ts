import { describe, expect, it } from 'vitest';
import { EMPTY_BUSINESS, LICENCE_PATTERN, missingBusiness } from './business';

describe('legal business details', () => {
  it('lists every field that blocks publishing', () => {
    expect(missingBusiness(EMPTY_BUSINESS)).toEqual([
      'legal business name',
      'business address',
      'trade licence number',
    ]);
    expect(
      missingBusiness({
        ...EMPTY_BUSINESS,
        legalName: { en: 'Zelqune', bn: '' },
        address: { en: 'Dhaka', bn: '' },
        tradeLicence: 'TRAD/1',
      }),
    ).toEqual([]);
  });

  it('accepts licence numbers with letters, digits and separators only', () => {
    expect(LICENCE_PATTERN.test('TRAD/DNCC/012345/2026')).toBe(true);
    expect(LICENCE_PATTERN.test('<script>')).toBe(false);
  });
});
