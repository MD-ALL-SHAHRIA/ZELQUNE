import { describe, expect, it } from 'vitest';
import { formatTaka, humanize } from './format';

describe('format', () => {
  it('shows paisa as whole taka with separators', () => {
    expect(formatTaka(349000)).toBe('৳3,490');
    expect(formatTaka(0)).toBe('৳0');
  });
  it('turns enum values into words', () => {
    expect(humanize('PENDING_PAYMENT')).toBe('Pending payment');
  });
});
