import { describe, expect, it } from 'vitest';
import { percentOff, timeLeft } from './countdown';

describe('offers', () => {
  it('counts down to the real end time and stops there', () => {
    const now = Date.parse('2026-10-24T10:00:00Z');
    expect(timeLeft('2026-10-26T13:04:05Z', now)).toEqual({ d: 2, hh: '03', mm: '04', ss: '05' });
    expect(timeLeft('2026-10-24T10:00:00Z', now)).toBeNull();
  });

  it('never overstates the discount', () => {
    expect(percentOff(449_000, 381_700)).toBe(14);
    expect(percentOff(100_000, 100_000)).toBe(0);
  });
});
