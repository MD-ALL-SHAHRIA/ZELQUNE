import { Logger } from '@nestjs/common';
import { type OutboxService } from '@zelqune/common';
import { type InventoryEnv } from '../config/inventory-env';
import { type PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';

describe('InventoryService.releaseExpired', () => {
  it('keeps releasing the rest of the batch when one reservation fails', async () => {
    const due = [{ order_id: 'a' }, { order_id: 'b' }, { order_id: 'c' }];
    const prisma = { $queryRaw: jest.fn().mockResolvedValue(due) } as unknown as PrismaService;
    const service = new InventoryService(
      prisma,
      {} as OutboxService,
      { NODE_ENV: 'test' } as InventoryEnv,
    );
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const release = jest
      .spyOn(service, 'release')
      .mockRejectedValueOnce(new Error('broken row'))
      .mockResolvedValue({ released: true });

    await expect(service.releaseExpired()).resolves.toBe(2);
    expect(release.mock.calls.map(([input]) => input.orderId)).toEqual(['a', 'b', 'c']);
  });
});
