import {
  orderCancelled,
  orderConfirmed,
  orderPlaced,
  orderStatusChanged,
  paymentVerified,
  quoteRequested,
} from '@zelqune/contracts';
import { randomUUID } from 'node:crypto';
import { type NotificationEnv } from '../config/notification-env';
import { type Prisma } from '../generated/prisma/client';
import { FakeSmsProvider } from '../sms/sms.provider';
import { ContactNotYetKnownError, NotificationService } from './notification.service';
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

  it('delivered shop orders get one thank-you asking for a photo; other changes send nothing', async () => {
    const sms = new FakeSmsProvider();
    const { tx } = fakeTx();
    const service = new NotificationService(sms, config);
    await service.onOrderPlaced(placed(0, 'COD'), tx);
    const changed = (to: 'SHIPPED' | 'DELIVERED', channel: 'B2C' | 'B2B' = 'B2C') =>
      orderStatusChanged.create(
        {
          orderId,
          code: 'ZQ-7K3M9P',
          from: to === 'DELIVERED' ? 'SHIPPED' : 'READY_TO_SHIP',
          to,
          channel,
          changedAt: new Date().toISOString(),
        },
        { source: 'order-service' },
      );
    await service.onOrderStatusChanged(changed('SHIPPED'), tx);
    await service.onOrderStatusChanged(changed('DELIVERED', 'B2B'), tx);
    const delivered = changed('DELIVERED');
    await service.onOrderStatusChanged(delivered, tx);
    await service.onOrderStatusChanged(delivered, tx); // redelivered event: no second SMS
    expect(sms.sent).toHaveLength(2);
    expect(sms.sent[1].body).toContain('ZQ-7K3M9P');
    expect(sms.sent[1].body).toContain('ছবি');
  });

  it('an event that arrives before order.placed is retried, not dropped, then sent', async () => {
    const sms = new FakeSmsProvider();
    const { tx } = fakeTx();
    const service = new NotificationService(sms, config);
    const verified = paymentVerified.create(
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
    );
    // payment.verified first: no contact yet -> a retryable error (not NonRetryableError).
    await expect(service.onPaymentVerified(verified, tx)).rejects.toBeInstanceOf(
      ContactNotYetKnownError,
    );
    expect(sms.sent).toHaveLength(0);
    // After order.placed is processed, the retried event sends its SMS.
    await service.onOrderPlaced(placed(30000, 'BKASH_MANUAL'), tx);
    await service.onPaymentVerified(verified, tx);
    expect(sms.sent.map((m) => m.body).some((b) => b.includes('পেমেন্ট পেয়েছি'))).toBe(true);
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

  it('alerts the owner about construction enquiries', async () => {
    const event = quoteRequested.create(
      {
        quoteId: randomUUID(),
        code: 'QT-7H4J2K',
        kind: 'CONSTRUCTION',
        spaceType: 'HOME',
        organizationName: null,
        contactName: 'Karim',
        itemCount: 0,
        totalQty: 0,
        neededBy: null,
      },
      { source: 'order-service' },
    );
    const sms = new FakeSmsProvider();
    await new NotificationService(sms, config).onQuoteRequested(event, fakeTx().tx);
    expect(sms.sent[0]?.body).toContain('নির্মাণের অনুরোধ');
    expect(sms.sent[0]?.body).toContain('বাসা');
  });

  it('a rolled-back consumer transaction does not send the SMS again on retry', async () => {
    const sms = new FakeSmsProvider();
    const db = fakeTx(); // committed store for the send log
    const service = new NotificationService(sms, config, undefined, db.tx as never);
    const event = placed(0, 'COD');
    await service.onOrderPlaced(event, fakeTx().tx); // tx rolled back after the send
    await service.onOrderPlaced(event, fakeTx().tx); // the consumer retries with a fresh tx
    expect(sms.sent.filter((m) => m.to === '+8801712345678')).toHaveLength(1);
  });

  describe('order emails', () => {
    const sentMail: { to: string; subject: string; text: string }[] = [];
    const mail = {
      name: 'fake',
      send: (m: { to: string; subject: string; text: string }) => {
        sentMail.push(m);
        return Promise.resolve({ providerRef: `m-${sentMail.length}` });
      },
    };
    const withEmail = (email: string | null, lang: 'en' | 'bn') =>
      orderPlaced.create(
        {
          ...placed(30000, 'BKASH_MANUAL').payload,
          items: [
            {
              variantId: randomUUID(),
              sku: 'ALO-WAL',
              qty: 1,
              unitPricePaisa: 349000,
              nameEn: 'Alo-Arch Panel',
              nameBn: 'আলো-আর্চ প্যানেল',
            },
          ],
          customer: { name: 'Rahim', phone: '+8801712345678', email },
          lang,
        },
        { source: 'order-service' },
      );

    beforeEach(() => (sentMail.length = 0));

    it('sends the order email in the order language with items and totals, and alerts the owner', async () => {
      const { tx } = fakeTx();
      const service = new NotificationService(
        new FakeSmsProvider(),
        { ...config, OWNER_NOTIFY_EMAIL: 'owner@zelqune.com' },
        undefined,
        undefined,
        mail,
      );
      const event = withEmail('rahim@example.com', 'en');
      await service.onOrderPlaced(event, tx);
      await service.onOrderPlaced(event, tx); // redelivered: nothing twice
      expect(sentMail.map((m) => m.to)).toEqual(['rahim@example.com', 'owner@zelqune.com']);
      expect(sentMail[0].subject).toBe("We've received your order ZQ-7K3M9P");
      expect(sentMail[0].text).toContain('Alo-Arch Panel × 1');
      expect(sentMail[0].text).toContain('Pay now (advance): ৳300');
      expect(sentMail[1].subject).toMatch(/^New order ZQ-7K3M9P/);
    });

    it('emails production, shipping and delivery steps, in Bangla for a Bangla order', async () => {
      const { tx } = fakeTx();
      const service = new NotificationService(
        new FakeSmsProvider(),
        config,
        undefined,
        undefined,
        mail,
      );
      await service.onOrderPlaced(withEmail('rahim@example.com', 'bn'), tx);
      for (const to of ['IN_PRODUCTION', 'READY_TO_SHIP', 'SHIPPED'] as const)
        await service.onOrderStatusChanged(
          orderStatusChanged.create(
            {
              orderId,
              code: 'ZQ-7K3M9P',
              from: 'CONFIRMED',
              to,
              channel: 'B2C',
              changedAt: new Date().toISOString(),
            },
            { source: 'order-service' },
          ),
          tx,
        );
      expect(sentMail.map((m) => m.subject)).toEqual([
        'আপনার অর্ডার ZQ-7K3M9P পেয়েছি',
        'অর্ডার ZQ-7K3M9P: আপনার পণ্য তৈরি হচ্ছে',
        'অর্ডার ZQ-7K3M9P রওনা হয়েছে',
      ]);
    });

    it('sends no email when the customer gave none (SMS still goes)', async () => {
      const sms = new FakeSmsProvider();
      const { tx } = fakeTx();
      const service = new NotificationService(sms, config, undefined, undefined, mail);
      await service.onOrderPlaced(withEmail(null, 'en'), tx);
      expect(sentMail).toHaveLength(0);
      expect(sms.sent).toHaveLength(1);
    });
  });
});
