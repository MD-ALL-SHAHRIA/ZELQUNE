import { type ServiceEnv } from '@zelqune/common';
import { type PrismaService } from '../prisma/prisma.service';
import { RetentionService } from './retention.service';

describe('RetentionService', () => {
  it('deletes tracked events older than 90 days, batch by batch', async () => {
    const $executeRaw = jest.fn().mockResolvedValueOnce(5000).mockResolvedValueOnce(12);
    const service = new RetentionService(
      { $executeRaw } as unknown as PrismaService,
      { NODE_ENV: 'test' } as ServiceEnv,
    );
    const now = new Date('2026-11-06T00:00:00Z');

    await expect(service.deleteExpired(now)).resolves.toBe(5012);
    expect($executeRaw).toHaveBeenCalledTimes(2);
    const [strings, cutoff] = $executeRaw.mock.calls[0] as [TemplateStringsArray, Date];
    expect(strings.join('?')).toContain('DELETE FROM tracked_events');
    expect(cutoff.toISOString()).toBe('2026-08-08T00:00:00.000Z');
  });
});
