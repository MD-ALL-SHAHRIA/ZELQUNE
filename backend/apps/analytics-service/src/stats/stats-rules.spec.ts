import { bdRange, bdToday, conversionRate, GO_STATUSES, resolveRange } from './stats-rules';

describe('stats rules', () => {
  it('GO counts active paid statuses only', () => {
    expect(GO_STATUSES).toEqual([
      'CONFIRMED',
      'IN_PRODUCTION',
      'READY_TO_SHIP',
      'SHIPPED',
      'DELIVERED',
      'RETURN_REQUESTED',
    ]);
    for (const s of ['PENDING_PAYMENT', 'CANCELLED', 'RETURNED', 'REFUNDED'] as const)
      expect(GO_STATUSES).not.toContain(s);
  });

  it('uses Bangladesh calendar days', () => {
    expect(bdToday(new Date('2026-10-19T17:59:00Z'))).toBe('2026-10-19');
    expect(bdToday(new Date('2026-10-19T18:00:00Z'))).toBe('2026-10-20');
    expect(bdRange('2026-10-19', '2026-10-19')).toEqual({
      start: new Date('2026-10-18T18:00:00Z'),
      end: new Date('2026-10-19T18:00:00Z'),
    });
  });

  it('defaults to the last 30 days and validates ranges', () => {
    expect(resolveRange({}, new Date('2026-10-19T10:00:00Z'))).toEqual({
      from: '2026-09-20',
      to: '2026-10-19',
    });
    expect(() => resolveRange({ from: '2026-10-20', to: '2026-10-19' })).toThrow(/on or before/);
    expect(() => resolveRange({ from: '2024-01-01', to: '2026-01-01' })).toThrow(/366/);
  });

  it('conversion rate is purchases per session, 4 decimals, 0 without sessions', () => {
    expect(conversionRate(1, 3)).toBe(0.3333);
    expect(conversionRate(5, 0)).toBe(0);
  });
});
