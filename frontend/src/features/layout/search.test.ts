import { describe, expect, it } from 'vitest';
import { correct, haystackOf, search, type SearchIndex } from './search';
import { isActivePath } from './nav';

const index: SearchIndex = {
  products: [
    {
      href: '/en/products/wave-shelf',
      title: 'Wave Shelf',
      haystack: haystackOf('Wave Shelf', 'ওয়েভ শেলফ', 'wave-shelf'),
      price: '৳5,490',
      image: null,
    },
    {
      href: '/en/products/alo-arch-panel',
      title: 'Alo-Arch Panel',
      haystack: haystackOf('Alo-Arch Panel', 'আলো-আর্চ প্যানেল'),
      price: null,
      image: null,
    },
  ],
  pages: [{ href: '/en/faq', title: 'FAQ', haystack: haystackOf('FAQ', 'প্রশ্ন') }],
};

describe('search', () => {
  it('returns everything for an empty query', () => {
    expect(search(index, '  ')).toBe(index);
  });

  it('matches English names case-insensitively', () => {
    expect(search(index, 'WAVE').products.map((p) => p.title)).toEqual(['Wave Shelf']);
  });

  it('matches Bangla names', () => {
    expect(search(index, 'শেলফ').products.map((p) => p.title)).toEqual(['Wave Shelf']);
    expect(search(index, 'প্রশ্ন').pages).toHaveLength(1);
  });

  it('needs every word to match', () => {
    expect(search(index, 'arch panel').products).toHaveLength(1);
    expect(search(index, 'arch shelf').products).toHaveLength(0);
  });
});

describe('isActivePath', () => {
  it('matches the page and pages below it', () => {
    expect(isActivePath('/en/design', '/en/design')).toBe(true);
    expect(isActivePath('/en/design/home', '/en/design')).toBe(true);
    expect(isActivePath('/en/designer', '/en/design')).toBe(false);
  });

  it('matches home only exactly', () => {
    expect(isActivePath('/en', '/en')).toBe(true);
    expect(isActivePath('/en/shop', '/en')).toBe(false);
  });
});

describe('correct (did you mean)', () => {
  const idx = {
    products: [
      {
        href: '/p/1',
        title: 'Alo-Arch Panel',
        haystack: 'alo-arch panel wall lighting',
        price: null,
        image: null,
      },
    ],
    pages: [{ href: '/shelves', title: 'Shelves', haystack: 'shelves floating' }],
  };
  it('fixes a typo when the fixed query finds something', () => {
    expect(correct(idx, 'lightng')).toBe('lighting');
    expect(correct(idx, 'shelfs')).toBe('shelves');
  });
  it('leaves good or hopeless queries alone', () => {
    expect(correct(idx, 'panel')).toBeNull();
    expect(correct(idx, 'zzzzzz')).toBeNull();
  });
});
