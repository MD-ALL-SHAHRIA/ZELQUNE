import { bdDayOf, bdDays, bdMonths, previousRange, resolveReportRange } from './bd-calendar';

describe('BD calendar', () => {
  it('maps instants to Bangladesh days', () => {
    expect(bdDayOf(new Date('2026-10-23T18:30:00Z'))).toBe('2026-10-24');
  });

  it('defaults to 30 days and rejects bad ranges', () => {
    expect(resolveReportRange({}, new Date('2026-10-24T06:00:00Z'))).toEqual({
      from: '2026-09-25',
      to: '2026-10-24',
    });
    expect(resolveReportRange({ from: '2026-10-02', to: '2026-10-01' })).toBeNull();
    expect(resolveReportRange({ from: '2024-01-01', to: '2026-01-01' })).toBeNull();
  });

  it('builds the previous period, days and months', () => {
    expect(previousRange({ from: '2026-10-01', to: '2026-10-10' })).toEqual({
      from: '2026-09-21',
      to: '2026-09-30',
    });
    expect(bdDays('2026-10-30', '2026-11-01')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
    expect(bdMonths('2026-11-15', '2027-01-02')).toEqual(['2026-11', '2026-12', '2027-01']);
  });
});
