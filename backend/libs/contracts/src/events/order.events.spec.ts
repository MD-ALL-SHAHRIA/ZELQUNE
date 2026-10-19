import { orderCancelled, orderPlaced, paymentVerified, stockReleased } from './order.events';
import { orderCodeSchema, ORDER_CODE_ALPHABET } from '../orders/orders.contracts';
import { trxIdSchema } from '../payments/payments.contracts';

const id = '0b6f0a3e-7f2a-4c35-9a5e-2f1d0c1b2a3e';
const meta = { source: 'order-service' };

describe('order/stock/payment event contracts (v1)', () => {
  it('order.placed requires integer paisa and a known sale mode', () => {
    const base = {
      orderId: id,
      code: 'ZQ-7K3M9P',
      saleMode: 'PRE_ORDER' as const,
      items: [{ variantId: id, sku: 'ALO-ARCH-WALNUT', qty: 1, unitPricePaisa: 349000 }],
      subtotalPaisa: 349000,
      shippingFeePaisa: 17000,
      totalPaisa: 366000,
      advanceRequiredPaisa: 30000,
      paymentMethod: 'BKASH_MANUAL' as const,
      experimentKey: 'a' as const,
      stockReserved: false,
    };
    expect(orderPlaced.create(base, meta).type).toBe('order.placed');
    expect(() => orderPlaced.create({ ...base, totalPaisa: 3660.5 }, meta)).toThrow();
  });

  it('stock.released and order.cancelled enumerate their reasons', () => {
    expect(() =>
      stockReleased.create({ reservationId: id, orderId: id, items: [], reason: 'EXPIRED' }, meta),
    ).not.toThrow();
    expect(() =>
      stockReleased.create(
        { reservationId: id, orderId: id, items: [], reason: 'BORED' } as never,
        meta,
      ),
    ).toThrow();
    expect(() =>
      orderCancelled.create(
        {
          orderId: id,
          code: 'ZQ-7K3M9P',
          reason: 'PAYMENT_TIMEOUT',
          cancelledAt: new Date().toISOString(),
        },
        meta,
      ),
    ).not.toThrow();
  });

  it('payment.verified carries who verified', () => {
    const e = paymentVerified.create(
      {
        paymentId: id,
        orderId: id,
        orderCode: 'ZQ-7K3M9P',
        method: 'COD',
        kind: 'COD',
        amountPaisa: 1,
        verifiedBy: id,
        verifiedAt: new Date().toISOString(),
      },
      meta,
    );
    expect(e.payload.verifiedBy).toBe(id);
  });
});

describe('order code and trxId formats', () => {
  it('order codes use an unambiguous alphabet', () => {
    expect(ORDER_CODE_ALPHABET).not.toMatch(/[01OIL]/);
    expect(orderCodeSchema.parse(' zq-7k3m9p ')).toBe('ZQ-7K3M9P');
    expect(orderCodeSchema.safeParse('ZQ-10001').success).toBe(false);
    expect(orderCodeSchema.safeParse('ZQ-7K3M9O').success).toBe(false);
  });

  it('normalises trxIds', () => {
    expect(trxIdSchema.parse(' 8n7a-6b5c 4d ')).toBe('8N7A6B5C4D');
    expect(trxIdSchema.safeParse('abc').success).toBe(false);
    expect(trxIdSchema.safeParse('8N7A6B5C4D!').success).toBe(false);
  });
});
