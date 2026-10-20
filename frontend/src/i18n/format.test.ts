import { describe, expect, it } from 'vitest';
import { fill, formatTaka, splitPlaceholders } from './format';

describe('format', () => {
  it('formats paisa as taka in both languages', () => {
    expect(formatTaka(349000, 'en')).toBe('৳3,490');
    expect(formatTaka(7516250, 'en')).toBe('৳75,162.5');
    expect(formatTaka(349000, 'bn')).toBe('৳৩,৪৯০');
  });

  it('fills slots and leaves unknown ones visible', () => {
    expect(fill('Delivery to {district}: {fee}', { district: 'Dhaka', fee: '৳70' })).toBe(
      'Delivery to Dhaka: ৳70',
    );
    expect(fill('ships within {days} days', {})).toBe('ships within {days} days');
  });

  it('splits [[...]] placeholders out of copy', () => {
    expect(splitPlaceholders('Glass tubes: [[number]]')).toEqual([
      { text: 'Glass tubes: ', placeholder: false },
      { text: '[[number]]', placeholder: true },
    ]);
  });
});
