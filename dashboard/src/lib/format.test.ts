import { describe, expect, it } from 'vitest';
import { delta, formatTaka, formatTakaShort, humanize, timeAgo } from './format';

describe('format', () => {
  it('shows paisa as whole taka with lakh grouping', () => {
    expect(formatTaka(349000)).toBe('৳3,490');
    expect(formatTaka(12_345_600)).toBe('৳1,23,456');
  });
  it('shortens axis values', () => {
    expect(formatTakaShort(349000)).toBe('৳3.5k');
    expect(formatTakaShort(15_000_000)).toBe('৳1.5L');
  });
  it('turns enum values into words', () => {
    expect(humanize('PENDING_PAYMENT')).toBe('Pending payment');
  });
  it('compares periods and says when it cannot', () => {
    expect(delta(150, 100)).toBe(50);
    expect(delta(5, 0)).toBeNull();
  });
  it('says how long ago', () => {
    const now = Date.parse('2026-10-24T12:00:00Z');
    expect(timeAgo('2026-10-24T11:55:00Z', now)).toBe('5 minutes ago');
  });
});
