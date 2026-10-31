import { describe, expect, it } from 'vitest';
import { businessLine } from './business';

const b = {
  legalName: { en: 'Zelqune Test Ltd', bn: '' },
  address: { en: 'House 1, Dhaka', bn: 'বাড়ি ১, ঢাকা' },
  tradeLicence: 'TRAD/1',
  confirmed: true,
};

describe('businessLine', () => {
  it('shows nothing until the owner confirms', () => {
    expect(businessLine({ ...b, confirmed: false }, 'en', 'Trade licence')).toBeNull();
    expect(businessLine(undefined, 'en', 'Trade licence')).toBeNull();
  });

  it('formats one line and falls back to English per field', () => {
    expect(businessLine(b, 'en', 'Trade licence')).toBe(
      'Zelqune Test Ltd, House 1, Dhaka (Trade licence TRAD/1)',
    );
    expect(businessLine(b, 'bn', 'ট্রেড লাইসেন্স')).toBe(
      'Zelqune Test Ltd, বাড়ি ১, ঢাকা (ট্রেড লাইসেন্স TRAD/1)',
    );
  });
});
