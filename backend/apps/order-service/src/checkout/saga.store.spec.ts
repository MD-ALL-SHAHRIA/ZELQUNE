import { type EventEnvelope } from '@zelqune/contracts';
import { type PrismaService } from '../prisma/prisma.service';
import { type OrderDraft, PrismaSagaStore } from './saga.store';

const ORDER_ID = '6f1c1d3e-8f4b-4c2a-9a51-0c6f9a3e2b11';
const CART_ID = '0b7c2f7a-1d2e-4f3a-8b9c-5d6e7f8a9b0c';

/** A coupon whose redeem UPDATE matched no row (it expired or ran out after the cart priced it). */
function storeWith(coupon: object | null) {
  const sql: string[] = [];
  const tx = {
    $queryRaw: jest
      .fn()
      .mockResolvedValueOnce([{ status: 'PAYMENT_CREATED' }])
      .mockResolvedValueOnce([{ status: 'ACTIVE' }]),
    $executeRaw: jest.fn((parts: TemplateStringsArray) => {
      sql.push(parts.join('?'));
      return Promise.resolve(0);
    }),
    coupon: { findUnique: jest.fn().mockResolvedValue(coupon) },
    order: { create: jest.fn() },
  };
  const prisma = {
    $transaction: (fn: (t: typeof tx) => Promise<void>) => fn(tx),
  } as unknown as PrismaService;
  const store = new PrismaSagaStore(prisma, { add: jest.fn() });
  const complete = () =>
    store.complete(
      ORDER_ID,
      { couponCode: 'EID10', items: [] } as unknown as OrderDraft,
      {} as EventEnvelope,
      { kind: 'cart', cartId: CART_ID },
    );
  return { complete, sql, tx };
}

const rule = {
  code: 'EID10',
  kind: 'PERCENT',
  value: 10,
  minSubtotalPaisa: 0,
  maxDiscountPaisa: null,
  startsAt: null,
  endsAt: null,
  maxUses: 5,
  usedCount: 0,
  active: true,
};

describe('PrismaSagaStore.complete coupon redeem', () => {
  it('the redeem UPDATE also refuses an expired coupon', async () => {
    const { complete, sql } = storeWith({ ...rule, endsAt: new Date(Date.now() - 1000) });
    await complete().catch(() => undefined);
    expect(sql[0]).toContain('ends_at IS NULL OR ends_at > now()');
  });

  it('an expired coupon is rejected as EXPIRED and no order is created', async () => {
    const { complete, tx } = storeWith({ ...rule, endsAt: new Date(Date.now() - 1000) });
    await expect(complete()).rejects.toMatchObject({
      code: 'COUPON_INVALID',
      details: { reason: 'EXPIRED' },
    });
    expect(tx.order.create).not.toHaveBeenCalled();
  });

  it('a coupon used up meanwhile is rejected as USED_UP', async () => {
    const { complete } = storeWith({ ...rule, usedCount: 5 });
    await expect(complete()).rejects.toMatchObject({ details: { reason: 'USED_UP' } });
  });
});
