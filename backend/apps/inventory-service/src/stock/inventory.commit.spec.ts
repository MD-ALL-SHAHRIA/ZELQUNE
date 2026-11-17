import { type InventoryEnv } from '../config/inventory-env';
import { type PrismaService } from '../prisma/prisma.service';
import { InventoryService } from './inventory.service';

const ORDER = '00000000-0000-4000-8000-000000000001';
const VARIANT = '00000000-0000-4000-8000-0000000000a1';

/** A reservation released by the expiry sweep, then the order is confirmed anyway. */
function setup(onHand: number, reserved: number) {
  const reservation = {
    id: 'r1',
    orderId: ORDER,
    status: 'RELEASED',
    releaseReason: 'EXPIRED',
    items: [{ variantId: VARIANT, qty: 2 }],
  };
  const tx = {
    $queryRaw: jest
      .fn()
      .mockResolvedValueOnce([]) // reservation lock
      .mockResolvedValueOnce([{ variantId: VARIANT, onHand, reserved }]), // stock rows
    stockReservation: {
      findUnique: jest.fn().mockResolvedValue(reservation),
      update: jest.fn().mockResolvedValue({}),
    },
    inventoryItem: { update: jest.fn().mockResolvedValue({}) },
    stockMovement: { create: jest.fn().mockResolvedValue({}) },
  };
  const outbox = { add: jest.fn().mockResolvedValue(undefined) };
  const service = new InventoryService({} as PrismaService, outbox, {
    NODE_ENV: 'test',
  } as InventoryEnv);
  return { service, tx, outbox };
}

describe('InventoryService.commit after the hold expired', () => {
  it('deducts the stock when it is still free', async () => {
    const { service, tx } = setup(5, 1);
    await service.commit(ORDER, tx as never);
    expect(tx.inventoryItem.update).toHaveBeenCalledWith({
      where: { variantId: VARIANT },
      data: { onHand: { decrement: 2 } },
    });
    expect(tx.stockMovement.create).toHaveBeenCalledWith({
      data: { variantId: VARIANT, delta: -2, reason: 'SALE', refId: ORDER },
    });
    expect(tx.stockReservation.update).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: { status: 'COMMITTED' },
    });
  });

  it('records a shortage for staff instead of overselling', async () => {
    const { service, tx, outbox } = setup(2, 1);
    await service.commit(ORDER, tx as never);
    expect(tx.inventoryItem.update).not.toHaveBeenCalled();
    expect(tx.stockReservation.update).not.toHaveBeenCalled();
    expect(outbox.add).toHaveBeenCalledTimes(1);
  });
});
