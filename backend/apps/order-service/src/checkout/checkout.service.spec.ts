import { AppError } from '@zelqune/common';
import { type CheckoutRequest, type EventEnvelope, type SaleMode } from '@zelqune/contracts';
import { type CartService, type PreparedCheckout } from '../carts/cart.service';
import { CheckoutService } from './checkout.service';
import { type CheckoutParticipants } from './participants';
import {
  type OrderDraft,
  OrderCodeTakenError,
  type SagaRecord,
  type SagaStore,
} from './saga.store';

const VARIANT = '0b6f0a3e-7f2a-4c35-9a5e-2f1d0c1b2a3e';

class FakeStore implements SagaStore {
  readonly sagas = new Map<string, SagaRecord>();
  readonly orders: OrderDraft[] = [];
  readonly events: EventEnvelope[] = [];
  takenCodes = 0;
  failComplete: Error | null = null;

  start(s: Pick<SagaRecord, 'id' | 'cartId' | 'code'>) {
    if (this.takenCodes > 0) {
      this.takenCodes--;
      return Promise.reject(new OrderCodeTakenError(s.code));
    }
    this.sagas.set(s.id, { ...s, status: 'STARTED', stockReserved: false, paymentCreated: false });
    return Promise.resolve();
  }
  advance(id: string, from: SagaRecord['status'], to: SagaRecord['status'], flags = {}) {
    const s = this.sagas.get(id);
    if (!s || s.status !== from) return Promise.resolve(false);
    Object.assign(s, { status: to }, flags);
    return Promise.resolve(true);
  }
  fail(id: string) {
    const s = this.sagas.get(id);
    if (s?.status === 'STARTED') s.status = 'FAILED';
    return Promise.resolve();
  }
  beginCompensation(id: string) {
    const s = this.sagas.get(id);
    if (!s || !['STARTED', 'STOCK_RESERVED', 'PAYMENT_CREATED', 'COMPENSATING'].includes(s.status))
      return Promise.resolve(null);
    s.status = 'COMPENSATING';
    return Promise.resolve({ ...s });
  }
  finishCompensation(id: string) {
    const s = this.sagas.get(id);
    if (s?.status === 'COMPENSATING') s.status = 'COMPENSATED';
    return Promise.resolve();
  }
  complete(id: string, order: OrderDraft, event: EventEnvelope) {
    if (this.failComplete) return Promise.reject(this.failComplete);
    const s = this.sagas.get(id);
    if (s?.status !== 'PAYMENT_CREATED')
      return Promise.reject(new AppError('CHECKOUT_ABORTED', 'x', 409));
    s.status = 'COMPLETED';
    this.orders.push(order);
    this.events.push(event);
    return Promise.resolve();
  }
  findStale() {
    return Promise.resolve(
      [...this.sagas.values()].filter((s) =>
        ['STARTED', 'STOCK_RESERVED', 'PAYMENT_CREATED', 'COMPENSATING'].includes(s.status),
      ),
    );
  }
}

function participants(overrides: Partial<CheckoutParticipants> = {}) {
  const calls: string[] = [];
  const p: CheckoutParticipants = {
    snapshot: jest.fn(),
    quoteShipping: jest.fn(),
    paymentInstructions: jest.fn(),
    reserveStock: jest.fn(
      () => (
        calls.push('reserve'),
        Promise.resolve({
          reservationId: 'r',
          orderId: 'o',
          status: 'PENDING',
          expiresAt: '',
          items: [],
        })
      ),
    ),
    releaseStock: jest.fn(() => (calls.push('release'), Promise.resolve({ released: true }))),
    createPayment: jest.fn(
      () => (
        calls.push('payment'),
        Promise.resolve({
          id: VARIANT,
          method: 'COD',
          kind: 'COD',
          status: 'COD_PENDING',
          amountPaisa: 366000,
          trxIdLast4: null,
        })
      ),
    ),
    voidPayment: jest.fn(() => (calls.push('void'), Promise.resolve({ voided: true }))),
    ...overrides,
  };
  return { p, calls };
}

function prepared(saleMode: SaleMode): PreparedCheckout {
  const totals = {
    subtotalPaisa: 349000,
    discountPaisa: 0,
    shippingFeePaisa: 17000,
    totalPaisa: 366000,
    advanceRequiredPaisa: saleMode === 'IN_STOCK' ? 0 : 30000,
  };
  return {
    cart: { id: 'cart-1', experimentKey: 'b', items: [] } as unknown as PreparedCheckout['cart'],
    lines: [
      {
        variantId: VARIANT,
        qty: 1,
        unitPricePaisa: 349000,
        snapshot: {
          variantId: VARIANT,
          productId: VARIANT,
          productSlug: 'p',
          sku: 'SKU-1',
          nameBn: 'ক',
          nameEn: 'A',
          options: {},
          saleMode,
          leadTimeDays: null,
          packageWeightGrams: null,
          packageLengthMm: null,
          packageWidthMm: null,
          packageHeightMm: null,
          price: null,
        },
      },
    ],
    saleMode,
    shipping: {
      zone: 'DHAKA',
      district: 'dhaka',
      actualWeightGrams: 2500,
      volumetricWeightGrams: 5600,
      chargeableWeightGrams: 6000,
      feePaisa: 17000,
    },
    totals,
    instructions: { bkash: { number: '01711111111', accountType: 'personal' }, nagad: null },
    allowedMethods: saleMode === 'IN_STOCK' ? ['COD', 'BKASH_MANUAL'] : ['BKASH_MANUAL'],
  };
}

const request = (overrides: Partial<CheckoutRequest> = {}): CheckoutRequest => ({
  customer: { name: 'Rahim', phone: '01712345678' },
  address: { district: 'dhaka', area: 'Mirpur', line: 'House 1, Road 2' },
  paymentMethod: 'COD',
  ...overrides,
});

function setup(saleMode: SaleMode, overrides: Partial<CheckoutParticipants> = {}) {
  const store = new FakeStore();
  const { p, calls } = participants(overrides);
  const carts = {
    loadActive: jest.fn().mockResolvedValue({ id: 'cart-1' }),
    prepare: jest.fn().mockResolvedValue(prepared(saleMode)),
  } as unknown as Pick<CartService, 'loadActive' | 'prepare'>;
  const service = new CheckoutService(carts, p, store, {
    NODE_ENV: 'test',
    SAGA_RECOVERY_AFTER_SECONDS: 60,
    ORDER_SWEEP_INTERVAL_MS: 1000,
  });
  return { service, store, calls, p };
}

const onlySaga = (store: FakeStore) => [...store.sagas.values()][0];

describe('CheckoutService saga', () => {
  it('IN_STOCK + COD: reserve -> payment -> order + order.placed', async () => {
    const { service, store, calls } = setup('IN_STOCK');
    const res = await service.checkout('token', request());
    expect(calls).toEqual(['reserve', 'payment']);
    expect(res).toMatchObject({
      status: 'PENDING_PAYMENT',
      saleMode: 'IN_STOCK',
      totals: { totalPaisa: 366000 },
    });
    expect(res.orderCode).toMatch(/^ZQ-[2-9A-HJKMNP-Z]{6}$/);
    expect(onlySaga(store)).toMatchObject({
      status: 'COMPLETED',
      stockReserved: true,
      paymentCreated: true,
    });
    expect(store.orders[0]).toMatchObject({
      code: res.orderCode,
      customerPhone: '+8801712345678',
      status: 'PENDING_PAYMENT',
    });
    expect(store.events[0]).toMatchObject({
      type: 'order.placed',
      payload: { stockReserved: true, experimentKey: 'b' },
    });
  });

  it('PRE_ORDER skips stock and charges the ৳300 advance', async () => {
    const { service, calls, p, store } = setup('PRE_ORDER');
    await service.checkout('token', request({ paymentMethod: 'BKASH_MANUAL', trxId: 'ABC123XYZ' }));
    expect(calls).toEqual(['payment']);
    expect(p.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'ADVANCE',
        amountPaisa: 30000,
        trxId: 'ABC123XYZ',
        payerPhone: '+8801712345678',
      }),
    );
    expect(store.events[0].payload).toMatchObject({
      stockReserved: false,
      advanceRequiredPaisa: 30000,
    });
  });

  it('PRE_ORDER with COD is refused before anything starts', async () => {
    const { service, calls, store } = setup('PRE_ORDER');
    await expect(service.checkout('token', request())).rejects.toMatchObject({
      code: 'ADVANCE_REQUIRED',
      status: 422,
    });
    expect(calls).toEqual([]);
    expect(store.sagas.size).toBe(0);
  });

  it('out of stock: saga FAILED, nothing to compensate', async () => {
    const { service, store, calls } = setup('IN_STOCK', {
      reserveStock: jest.fn().mockRejectedValue(new AppError('OUT_OF_STOCK', 'no', 409)),
    });
    await expect(service.checkout('token', request())).rejects.toMatchObject({
      code: 'OUT_OF_STOCK',
    });
    expect(onlySaga(store).status).toBe('FAILED');
    expect(calls).toEqual([]);
  });

  it('reserve timeout (unknown outcome): compensates defensively', async () => {
    const { service, store, calls } = setup('IN_STOCK', {
      reserveStock: jest.fn().mockRejectedValue(new AppError('UPSTREAM_TIMEOUT', 'slow', 504)),
    });
    await expect(service.checkout('token', request())).rejects.toMatchObject({
      code: 'UPSTREAM_TIMEOUT',
    });
    expect(calls).toEqual(['void', 'release']);
    expect(onlySaga(store).status).toBe('COMPENSATED');
  });

  it('payment fails (duplicate trxId): stock is released, error passed through', async () => {
    const { service, store, calls } = setup('IN_STOCK', {
      createPayment: jest.fn().mockRejectedValue(new AppError('TRX_ID_ALREADY_USED', 'used', 409)),
    });
    await expect(
      service.checkout('token', request({ paymentMethod: 'BKASH_MANUAL', trxId: 'DUP12345' })),
    ).rejects.toMatchObject({ code: 'TRX_ID_ALREADY_USED', status: 409 });
    expect(calls).toEqual(['reserve', 'void', 'release']);
    expect(onlySaga(store)).toMatchObject({
      status: 'COMPENSATED',
      stockReserved: true,
      paymentCreated: false,
    });
    expect(store.orders).toHaveLength(0);
  });

  it('order creation fails: payment voided and stock released, 503 to the client', async () => {
    const { service, store, calls } = setup('IN_STOCK');
    store.failComplete = new Error('db down');
    await expect(service.checkout('token', request())).rejects.toMatchObject({
      code: 'CHECKOUT_FAILED',
      status: 503,
    });
    expect(calls).toEqual(['reserve', 'payment', 'void', 'release']);
    expect(onlySaga(store).status).toBe('COMPENSATED');
  });

  it('a failing compensation leaves the saga COMPENSATING; recovery finishes it', async () => {
    const release = jest
      .fn()
      .mockRejectedValueOnce(new Error('inventory down'))
      .mockResolvedValue({ released: true });
    const { service, store } = setup('IN_STOCK', {
      createPayment: jest.fn().mockRejectedValue(new AppError('TRX_ID_ALREADY_USED', 'used', 409)),
      releaseStock: release,
    });
    await expect(
      service.checkout('token', request({ paymentMethod: 'BKASH_MANUAL', trxId: 'DUP12345' })),
    ).rejects.toBeDefined();
    expect(onlySaga(store).status).toBe('COMPENSATING');

    await expect(service.recoverStale(new Date(Date.now() + 120_000))).resolves.toBe(1);
    expect(onlySaga(store).status).toBe('COMPENSATED');
    expect(release).toHaveBeenCalledTimes(2);
  });

  it('recovery compensates sagas abandoned mid-way (e.g. crash after reserving)', async () => {
    const { service, store, calls } = setup('IN_STOCK');
    store.sagas.set('crashed', {
      id: 'crashed',
      cartId: 'c',
      code: 'ZQ-CRASH2',
      status: 'STOCK_RESERVED',
      stockReserved: true,
      paymentCreated: false,
    });
    store.sagas.set('done', {
      id: 'done',
      cartId: 'c',
      code: 'ZQ-DONE22',
      status: 'COMPLETED',
      stockReserved: true,
      paymentCreated: true,
    });
    await expect(service.recoverStale(new Date(Date.now() + 120_000))).resolves.toBe(1);
    expect(store.sagas.get('crashed')?.status).toBe('COMPENSATED');
    expect(store.sagas.get('done')?.status).toBe('COMPLETED');
    expect(calls).toEqual(['void', 'release']);
  });

  it('compensating twice is harmless (idempotent)', async () => {
    const { service, store, calls } = setup('IN_STOCK');
    store.sagas.set('x', {
      id: 'x',
      cartId: 'c',
      code: 'ZQ-XXXXX2',
      status: 'PAYMENT_CREATED',
      stockReserved: true,
      paymentCreated: true,
    });
    expect(await service.compensate('x', new Error('a'))).toBe(true);
    expect(await service.compensate('x', new Error('b'))).toBe(false);
    expect(calls).toEqual(['void', 'release']);
  });

  it('retries order-code collisions', async () => {
    const { service, store } = setup('IN_STOCK');
    store.takenCodes = 3;
    await expect(service.checkout('token', request())).resolves.toMatchObject({
      status: 'PENDING_PAYMENT',
    });
  });
});
