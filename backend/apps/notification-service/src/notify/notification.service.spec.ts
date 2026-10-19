import {
  orderCancelled,
  orderConfirmed,
  orderPlaced,
  paymentVerified,
  quoteRequested,
} from '@zelqune/contracts';
import { randomUUID } from 'node:crypto';
import { type NotificationEnv } from '../config/notification-env';
import { type Prisma } from '../generated/prisma/client';
import { FakeSmsProvider } from '../sms/sms.provider';
import { NotificationService } from './notification.service';
import { formatTaka } from './templates';

/** In-memory stand-in for the two tables the service uses. */
function fakeTx() {
  const contacts = new Map<string, Record<string, unknown>>();
  const logs = new Map<string, Record<string, unknown>>();
  const key = (w: { eventId_template: { eventId: string; template: string } }) =>
    `${w.eventId_template.eventId}:${w.eventId_template.template}`;
  return {
    logs,
    tx: {
      orderContact: {
        upsert: ({
          where,
          create,
        }: {
          where: { orderId: string };
          create: Record<string, unknown>;
        }) => (contacts.set(where.orderId, create), Promise.resolve(create)),
        findUnique: ({ where }: { where: { orderId: string } }) =>
          Promise.resolve(contacts.get(where.orderId) ?? null),
      },
      notificationLog: {
        findUnique: ({ where }: { where: Parameters<typeof key>[0] }) =>
          Promise.resolve(logs.get(key(where)) ?? null),
        upsert: ({
          where,
          create,
        }: {
          where: Parameters<typeof key>[0];
          create: Record<string, unknown>;
        }) => (logs.set(key(where), create), Promise.resolve(create)),
      },
    } as unknown as Prisma.TransactionClient,
  };
}

const orderId = randomUUID();
const placed = (advance: number, method: 'COD' | 'BKASH_MANUAL') =>
  orderPlaced.create(
    {
      orderId,
      code: 'ZQ-7K3M9P',
      saleMode: advance ? 'PRE_ORDER' : 'IN_STOCK',
      items: [],
      subtotalPaisa: 429000,
      shippingFeePaisa: 17000,
      totalPaisa: 446000,
      advanceRequiredPaisa: advance,
      paymentMethod: method,
      experimentKey: null,
      stockReserved: false,
      customer: { name: 'Rahim', phone: '+8801712345678' },
    },
    { source: 'order-service' },
  );

describe('NotificationService', () => {
  const config = {
    STOREFRONT_URL: 'https://zelqune.example',
    OWNER_NOTIFY_PHONE: '+8801999999999',
  } as NotificationEnv;

  it('formats taka', () => {
    expect([formatTaka(30000), formatTaka(446000), formatTaka(349050)]).toEqual([
      '৳300',
      '৳4,460',
      '৳3,490.50',
    ]);
  });

  it('pre-order: placed SMS mentions the advance and tracking link; payment SMS confirms', async () => {
    const sms = new FakeSmsProvider();
    const { tx } = fakeTx();
    const service = new NotificationService(sms, config);
    await service.onOrderPlaced(placed(30000, 'BKASH_MANUAL'), tx);
    await service.onPaymentVerified(
      paymentVerified.create(
        {
          paymentId: randomUUID(),
          orderId,
          orderCode: 'ZQ-7K3M9P',
          method: 'BKASH_MANUAL',
          kind: 'ADVANCE',
          amountPaisa: 30000,
          verifiedBy: randomUUID(),
          verifiedAt: new Date().toISOString(),
        },
        { source: 'payment-service' },
      ),
      tx,
    );
    // prepaid orders get no second "confirmed" SMS
    await service.onOrderConfirmed(
      orderConfirmed.create(
        { orderId, code: 'ZQ-7K3M9P', confirmedAt: new Date().toISOString() },
        { source: 'order-service' },
      ),
      tx,
    );
    expect(sms.sent.map((m) => m.to)).toEqual(['+8801712345678', '+8801712345678']);
    expect(sms.sent[0].body).toContain('৳300');
    expect(sms.sent[0].body).toContain('https://zelqune.example/track?code=ZQ-7K3M9P');
    expect(sms.sent[1].body).toContain('পেমেন্ট পেয়েছি');
  });

  it('COD: placed + confirmed SMS; cancellations explain the reason', async () => {
    const sms = new FakeSmsProvider();
    const { tx } = fakeTx();
    const service = new NotificationService(sms, config);
    await service.onOrderPlaced(placed(0, 'COD'), tx);
    await service.onOrderConfirmed(
      orderConfirmed.create(
        { orderId, code: 'ZQ-7K3M9P', confirmedAt: new Date().toISOString() },
        { source: 'order-service' },
      ),
      tx,
    );
    await service.onOrderCancelled(
      orderCancelled.create(
        {
          orderId,
          code: 'ZQ-7K3M9P',
          reason: 'PAYMENT_TIMEOUT',
          cancelledAt: new Date().toISOString(),
        },
        { source: 'order-service' },
      ),
      tx,
    );
    expect(sms.sent).toHaveLength(3);
    expect(sms.sent[0].body).toContain('ক্যাশ অন ডেলিভারি');
    expect(sms.sent[2].body).toContain('পেমেন্ট না পাওয়ায়');
  });

  it('never sends the same (event, template) twice; a failed send throws so it is retried', async () => {
    const sms = new FakeSmsProvider();
    const { tx, logs } = fakeTx();
    const service = new NotificationService(sms, config);
    const event = placed(30000, 'BKASH_MANUAL');
    sms.failNext = true;
    await expect(service.onOrderPlaced(event, tx)).rejects.toThrow('gateway down');
    await service.onOrderPlaced(event, tx);
    await service.onOrderPlaced(event, tx);
    expect(sms.sent).toHaveLength(1);
    expect([...logs.values()][0]).toMatchObject({
      status: 'SENT',
      template: 'order.placed',
      provider: 'fake',
    });
  });

  it('alerts the owner about new bulk requests (only when OWNER_NOTIFY_PHONE is set)', async () => {
    const event = quoteRequested.create(
      {
        quoteId: randomUUID(),
        code: 'QT-8M4K2P',
        organizationName: 'Cafe Aroma',
        contactName: 'Nadia',
        itemCount: 2,
        totalQty: 40,
        neededBy: null,
      },
      { source: 'order-service' },
    );
    const sms = new FakeSmsProvider();
    await new NotificationService(sms, config).onQuoteRequested(event, fakeTx().tx);
    expect(sms.sent).toEqual([
      { to: '+8801999999999', body: expect.stringContaining('Cafe Aroma') as string },
    ]);
    const silent = new FakeSmsProvider();
    await new NotificationService(silent, {
      ...config,
      OWNER_NOTIFY_PHONE: undefined,
    }).onQuoteRequested(event, fakeTx().tx);
    expect(silent.sent).toHaveLength(0);
  });

  it('alerts the owner about interior design requests, naming the space', async () => {
    const event = quoteRequested.create(
      {
        quoteId: randomUUID(),
        code: 'QT-9N5K3Q',
        kind: 'DESIGN',
        spaceType: 'RESTAURANT_CAFE',
        organizationName: null,
        contactName: 'Rafiq',
        itemCount: 0,
        totalQty: 0,
        neededBy: null,
      },
      { source: 'order-service' },
    );
    const sms = new FakeSmsProvider();
    await new NotificationService(sms, config).onQuoteRequested(event, fakeTx().tx);
    expect(sms.sent).toHaveLength(1);
    expect(sms.sent[0]?.body).toContain('ইন্টেরিয়র ডিজাইন');
    expect(sms.sent[0]?.body).toContain('রেস্টুরেন্ট/ক্যাফে');
    expect(sms.sent[0]?.body).toContain('Rafiq');
  });
});
