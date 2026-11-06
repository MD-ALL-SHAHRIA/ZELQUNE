import { type OutboxService } from '@zelqune/common';
import { type InventoryEnv } from '../config/inventory-env';
import { type PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';

const ORDER = '00000000-0000-4000-8000-000000000001';
const VARIANT = '00000000-0000-4000-8000-0000000000v1'.replace('v1', 'a1');

function setup(status: string, restockedAt: Date | null = null) {
  const reservation = {
    id: 'r1',
    orderId: ORDER,
    status,
    restockedAt,
    items: [{ variantId: VARIANT, qty: 2 }],
  };
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    stockReservation: {
      findUnique: jest.fn().mockResolvedValue(reservation),
      update: jest.fn(({ data }: { data: object }) => Promise.resolve(Object.assign(reservation, data))),
    },
    inventoryItem: { update: jest.fn().mockResolvedValue({}) },
    stockMovement: { create: jest.fn().mockResolvedValue({}) },
  };
  const service = new InventoryService(
    {} as PrismaService,
    {} as OutboxService,
    { NODE_ENV: 'test' } as InventoryEnv,
  );
  return { service, tx, reservation };
}

describe('InventoryService.restockCancelled (paid order cancelled)', () => {
  it('returns committed units to stock once, with a RETURN movement', async () => {
    const { service, tx } = setup('COMMITTED');
    await expect(service.restockCancelled(ORDER, tx as never)).resolves.toEqual({ restocked: true });
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { variantId: VARIANT },
      data: { onHand: { increment: 2 } },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ variantId: VARIANT, delta: 2, reason: 'RETURN', refId: ORDER }),
    });

    await expect(service.restockCancelled(ORDER, tx as never)).resolves.toEqual({ restocked: false });
    expect(tx.inventoryItem.update).toHaveBeenCalledTimes(1);
  });

  it('does nothing for reservations that were never committed', async () => {
    const { service, tx } = setup('RELEASED');
    await expect(service.restockCancelled(ORDER, tx as never)).resolves.toEqual({ restocked: false });
    expect(tx.inventoryItem.update).not.toHaveBeenCalled();
  });
});
