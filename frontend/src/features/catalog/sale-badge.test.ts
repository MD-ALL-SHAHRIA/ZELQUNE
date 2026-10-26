import { describe, expect, it } from 'vitest';
import { bn } from '@/i18n/dictionaries/bn';
import { en } from '@/i18n/dictionaries/en';
import { saleBadgeText } from './sale-badge';

describe('saleBadgeText', () => {
  it('fills the lead time from the catalog, in the page language', () => {
    expect(saleBadgeText(en, 'en', 'PRE_ORDER', 21)).toBe('Pre-order · ships within 21 days');
    expect(saleBadgeText(bn, 'bn', 'PRE_ORDER', 21)).toBe(
      'প্রি-অর্ডার · ২১ দিনে তৈরি হয়ে পাঠানো হবে',
    );
  });

  it('uses the default making time while the lead time is not set', () => {
    expect(saleBadgeText(en, 'en', 'MADE_TO_ORDER', null)).toBe('Made to order · 10 days');
    expect(saleBadgeText(bn, 'bn', 'MADE_TO_ORDER', null)).toBe('অর্ডারে বানানো · ১০ দিন');
  });

  it('never says in stock unless the product is IN_STOCK', () => {
    for (const dict of [en, bn]) {
      for (const mode of ['PRE_ORDER', 'MADE_TO_ORDER'] as const) {
        expect(saleBadgeText(dict, 'en', mode, 10)).not.toMatch(/in stock|স্টকে/i);
      }
    }
    expect(saleBadgeText(en, 'en', 'IN_STOCK', null)).toBe('In stock · delivered in 1–3 days');
  });
});
