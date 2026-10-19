import { type INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  auditRecorded,
  customerFriendFlagChanged,
  type EventEnvelope,
  orderConfirmed,
  orderPlaced,
  orderStatusChanged,
  paymentVerified,
} from '@zelqune/contracts';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../../apps/analytics-service/src/app.module';
import { PrismaService } from '../../apps/analytics-service/src/prisma/prisma.service';
import { ProjectionsService } from '../../apps/analytics-service/src/projections/projections.service';
import { StatsService } from '../../apps/analytics-service/src/stats/stats.service';
import { prepareDatabase } from './database';
import { IT, SCHEMAS, serviceDbUrl } from './it-env';

describe('analytics-service projections and stats on real Postgres', () => {
  let app: INestApplicationContext;
  let projections: ProjectionsService;
  let stats: StatsService;
  let db: PrismaService;
  const meta = { source: 'order-service' };
  const at = (iso: string) => ({ ...meta, occurredAt: new Date(iso) });

  beforeAll(async () => {
    const database = await prepareDatabase('zelqune_it_analytics', ['analytics']);
    Object.assign(process.env, {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      HTTP_PORT: '39208',
      TCP_PORT: '49208',
      DB_SCHEMA: SCHEMAS.analytics,
      DATABASE_URL: serviceDbUrl(SCHEMAS.analytics, database),
      RABBITMQ_URL: IT.rabbitUrl,
    });
    app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    projections = app.get(ProjectionsService);
    stats = app.get(StatsService);
    db = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
  });

  const apply = (handler: (e: EventEnvelope, tx: never) => Promise<void>, event: EventEnvelope) =>
    db.$transaction((tx) => handler.call(projections, event, tx as never));

  async function order(opts: {
    channel?: 'B2C' | 'B2B';
    saleMode?: 'PRE_ORDER' | 'IN_STOCK';
    customerKey: string;
    advance?: number;
    verifyAdvance?: boolean;
    confirm?: boolean;
    experimentKey?: 'a' | 'b' | null;
    sessionId?: string;
    placedAt?: string;
    totalPaisa?: number;
  }) {
    const orderId = randomUUID();
    const code = `ZQ-${randomUUID().slice(0, 6).toUpperCase()}`;
    const placedAt = opts.placedAt ?? new Date().toISOString();
    await apply(
      projections.onOrderPlaced,
      orderPlaced.create(
        {
          orderId,
          code,
          saleMode: opts.saleMode ?? 'PRE_ORDER',
          items: [],
          subtotalPaisa: 0,
          shippingFeePaisa: 0,
          totalPaisa: opts.totalPaisa ?? 446000,
          advanceRequiredPaisa: opts.advance ?? 30000,
          paymentMethod: opts.advance === 0 ? 'COD' : 'BKASH_MANUAL',
          experimentKey: opts.experimentKey ?? null,
          stockReserved: false,
          channel: opts.channel ?? 'B2C',
          customer: { name: 'Rahim', phone: '+8801712345678' },
          customerKey: opts.customerKey,
          sessionId: opts.sessionId,
        },
        at(placedAt),
      ),
    );
    if (opts.verifyAdvance) {
      await apply(
        projections.onPaymentVerified,
        paymentVerified.create(
          {
            paymentId: randomUUID(),
            orderId,
            orderCode: code,
            method: 'BKASH_MANUAL',
            kind: 'ADVANCE',
            amountPaisa: opts.advance ?? 30000,
            verifiedBy: randomUUID(),
            verifiedAt: new Date().toISOString(),
          },
          meta,
        ),
      );
    }
    if (opts.confirm) {
      const now = new Date().toISOString();
      await apply(
        projections.onOrderStatusChanged,
        orderStatusChanged.create(
          {
            orderId,
            code,
            from: 'PENDING_PAYMENT',
            to: 'CONFIRMED',
            channel: opts.channel ?? 'B2C',
            changedAt: now,
          },
          meta,
        ),
      );
      await apply(
        projections.onOrderConfirmed,
        orderConfirmed.create({ orderId, code, confirmedAt: now }, meta),
      );
    }
    return { orderId, code };
  }

  it('GO counts only B2C, non-friend orders with a VERIFIED advance in an active status', async () => {
    const before = (await stats.dashboard({})).go.count;
    await order({ customerKey: 'k-paid-1', verifyAdvance: true, confirm: true }); // counts
    await order({ customerKey: 'k-paid-2', verifyAdvance: true, confirm: true }); // counts
    await order({ customerKey: 'k-cod', advance: 0, saleMode: 'IN_STOCK', confirm: true }); // COD, never
    await order({ customerKey: 'k-unverified', confirm: false }); // not paid
    await order({ customerKey: 'k-b2b', channel: 'B2B', verifyAdvance: true, confirm: true }); // B2B
    const friend = await order({ customerKey: 'k-friend', verifyAdvance: true, confirm: true });
    expect((await stats.dashboard({})).go.count).toBe(before + 3);

    await apply(
      projections.onFriendFlagChanged,
      customerFriendFlagChanged.create(
        { customerKey: 'k-friend', isFriend: true, changedAt: new Date().toISOString() },
        meta,
      ),
    );
    expect((await stats.dashboard({})).go.count).toBe(before + 2);

    // a later cancellation removes it again
    await apply(
      projections.onOrderStatusChanged,
      orderStatusChanged.create(
        {
          orderId: friend.orderId,
          code: friend.code,
          from: 'CONFIRMED',
          to: 'CANCELLED',
          channel: 'B2C',
          changedAt: new Date(Date.now() + 1000).toISOString(),
        },
        meta,
      ),
    );
    const stale = orderStatusChanged.create(
      {
        orderId: friend.orderId,
        code: friend.code,
        from: 'PENDING_PAYMENT',
        to: 'CONFIRMED',
        channel: 'B2C',
        changedAt: new Date(Date.now() - 60_000).toISOString(),
      },
      meta,
    );
    await apply(projections.onOrderStatusChanged, stale); // out of order: ignored
    expect(
      (await db.orderFact.findUniqueOrThrow({ where: { orderId: friend.orderId } })).status,
    ).toBe('CANCELLED');
  });

  it('out-of-order: payment.verified before order.placed still counts once', async () => {
    const before = (await stats.dashboard({})).go.count;
    const orderId = randomUUID();
    await apply(
      projections.onPaymentVerified,
      paymentVerified.create(
        {
          paymentId: randomUUID(),
          orderId,
          orderCode: 'ZQ-OUTORD',
          method: 'BKASH_MANUAL',
          kind: 'ADVANCE',
          amountPaisa: 30000,
          verifiedBy: randomUUID(),
          verifiedAt: new Date().toISOString(),
        },
        meta,
      ),
    );
    await apply(
      projections.onOrderPlaced,
      orderPlaced.create(
        {
          orderId,
          code: 'ZQ-OUTORD',
          saleMode: 'PRE_ORDER',
          items: [],
          subtotalPaisa: 0,
          shippingFeePaisa: 0,
          totalPaisa: 446000,
          advanceRequiredPaisa: 30000,
          paymentMethod: 'BKASH_MANUAL',
          experimentKey: null,
          stockReserved: false,
          customerKey: 'k-out',
        },
        meta,
      ),
    );
    await apply(
      projections.onOrderStatusChanged,
      orderStatusChanged.create(
        {
          orderId,
          code: 'ZQ-OUTORD',
          from: 'PENDING_PAYMENT',
          to: 'CONFIRMED',
          channel: 'B2C',
          changedAt: new Date().toISOString(),
        },
        meta,
      ),
    );
    expect((await stats.dashboard({})).go.count).toBe(before + 1);
  });

  it('funnel and experiment conversion from beacons and orders', async () => {
    const s1 = 'session-aaaaaaaaaaaaaaaa';
    const s2 = 'session-bbbbbbbbbbbbbbbb';
    const s3 = 'session-cccccccccccccccc';
    await projections.track({ type: 'VIEW', sessionId: s1, p: 'a' });
    await projections.track({ type: 'VIEW', sessionId: s1, p: 'a' }); // same session
    await projections.track({ type: 'VIEW', sessionId: s2, p: 'b' });
    await projections.track({ type: 'VIEW', sessionId: s3, p: 'b' });
    await projections.track({ type: 'ADD_TO_CART', sessionId: s2, p: 'b' });
    await order({
      customerKey: 'k-exp',
      experimentKey: 'b',
      sessionId: s2,
      verifyAdvance: true,
      confirm: true,
    });

    const d = await stats.dashboard({});
    expect(d.funnel.views).toBeGreaterThanOrEqual(3);
    expect(d.funnel.addToCart).toBeGreaterThanOrEqual(1);
    const b = d.experiments.find((e) => e.key === 'b')!;
    expect(b).toMatchObject({ sessions: 2, checkouts: 1, purchases: 1, conversionRate: 0.5 });
    expect(d.experiments.find((e) => e.key === 'a')).toMatchObject({ sessions: 1, purchases: 0 });
    expect(d.revenueByDay.at(-1)?.revenuePaisa).toBeGreaterThan(0);
    expect(d.channels.b2b.orders).toBeGreaterThanOrEqual(1);
  });

  it('never stores the raw phone (ADR 0010)', async () => {
    const rows = await db.$queryRaw<{ hit: bigint }[]>`
      SELECT count(*) AS hit FROM order_facts WHERE row_to_json(order_facts)::text LIKE '%1712345678%'`;
    expect(Number(rows[0].hit)).toBe(0);
    const columns = await db.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns WHERE table_schema = 'analytics' AND column_name ILIKE '%phone%'`;
    expect(columns).toEqual([]);
  });

  it('stores audit entries idempotently and lists them newest first', async () => {
    const e = auditRecorded.create(
      {
        actor: { id: 'admin-1', role: 'OWNER' },
        action: 'payment.verify',
        entityType: 'payment',
        entityId: 'p1',
        summary: 'verified',
        changes: { amountReceivedPaisa: 30000 },
      },
      { source: 'payment-service' },
    );
    await apply(projections.onAuditRecorded, e);
    await apply(projections.onAuditRecorded, e);
    const page = await stats.auditLog({ page: 1, limit: 10, entityType: 'payment' });
    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({
      action: 'payment.verify',
      actor: { id: 'admin-1', role: 'OWNER' },
      source: 'payment-service',
    });
  });
});
