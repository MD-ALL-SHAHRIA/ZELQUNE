import { describe, expect, it } from 'vitest';
import { arrivalDate, formatArrival } from './arrival';

const now = new Date('2026-11-06T06:00:00Z'); // 12:00 in Dhaka

describe('arrivalDate', () => {
  it('adds the lead time and the longest courier time for the zone', () => {
    expect(formatArrival(arrivalDate(now, 'PRE_ORDER', 10, 'DHAKA'), 'en')).toBe('18 November');
    expect(formatArrival(arrivalDate(now, 'PRE_ORDER', 10, 'OUTSIDE'), 'en')).toBe('20 November');
    expect(formatArrival(arrivalDate(now, 'MADE_TO_ORDER', 21, 'SUBURB'), 'en')).toBe('1 December');
  });

  it('uses the default lead time and the longer courier time when unknown', () => {
    expect(formatArrival(arrivalDate(now, 'PRE_ORDER', null, null), 'en')).toBe('20 November');
  });

  it('in stock: courier time only', () => {
    expect(formatArrival(arrivalDate(now, 'IN_STOCK', 10, 'DHAKA'), 'en')).toBe('8 November');
  });

  it('formats in Bangla', () => {
    expect(formatArrival(arrivalDate(now, 'PRE_ORDER', 10, 'DHAKA'), 'bn')).toBe('১৮ নভেম্বর');
  });
});
