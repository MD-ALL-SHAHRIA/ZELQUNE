import { describe, expect, it } from 'vitest';
import { bn } from '@/i18n/dictionaries/bn';
import { en } from '@/i18n/dictionaries/en';
import { applyTexts, EDITABLE_TEXTS } from './editable-texts';

const at = (dict: unknown, path: string) =>
  path.split('.').reduce<unknown>((n, k) => (n as Record<string, unknown>)?.[k], dict);

describe('editable texts', () => {
  it('every editable path is a string in both languages', () => {
    for (const path of EDITABLE_TEXTS) {
      expect(typeof at(en, path), path).toBe('string');
      expect(typeof at(bn, path), path).toBe('string');
    }
  });

  it('applies listed paths, keeps built-in text when empty, ignores anything else', () => {
    const out = applyTexts(
      en,
      {
        'privacy.text': { en: 'New policy', bn: '' },
        'faq.items.1.a': { en: '  ', bn: 'x' },
        'brand.name': { en: 'Hacked', bn: '' },
        'faq.items.99.a': { en: 'Nope', bn: '' },
      },
      'en',
    );
    expect(out.privacy.text).toBe('New policy');
    expect(out.faq.items[1]?.a).toBe(en.faq.items[1]?.a);
    expect(out.brand.name).toBe('Zelqune');
    expect(out.faq.items).toHaveLength(en.faq.items.length);
    expect(en.privacy.text).not.toBe('New policy');
  });
});
