import { type INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../../apps/payment-service/src/app.module';
import { PaymentService } from '../../apps/payment-service/src/payments/payment.service';
import { PrismaService } from '../../apps/payment-service/src/prisma/prisma.service';
import { prepareDatabase } from './database';
import { IT, SCHEMAS, serviceDbUrl } from './it-env';

describe('payment-service on real Postgres', () => {
  let app: INestApplicationContext;
  let payments: PaymentService;
  let db: PrismaService;
  const admin = randomUUID();

  beforeAll(async () => {
    const database = await prepareDatabase('zelqune_it_payment', ['payments']);
    Object.assign(process.env, {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      HTTP_PORT: '39205',
      TCP_PORT: '49205',
      DB_SCHEMA: SCHEMAS.payments,
      DATABASE_URL: serviceDbUrl(SCHEMAS.payments, database),
      RABBITMQ_URL: IT.rabbitUrl,
      PAYMENT_BKASH_NUMBER: '01711111111',
    });
    app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    payments = app.get(PaymentService);
    db = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
  });

  const bkash = (orderId: string, trxId: string, amountPaisa = 30000) =>
    payments.create({
      orderId,
      orderCode: 'ZQ-TEST22',
      method: 'BKASH_MANUAL',
      kind: 'ADVANCE',
      amountPaisa,
      trxId,
    });

  it('trxIds are globally unique (normalised) and idempotent per order', async () => {
    const order = randomUUID();
    const first = await bkash(order, 'abc-123-xyz');
    expect(first).toMatchObject({ status: 'SUBMITTED', trxIdLast4: '3XYZ', amountPaisa: 30000 });
    // saga retry for the same order returns the same payment
    expect((await bkash(order, 'ABC123XYZ')).id).toBe(first.id);
    // another order cannot reuse it
    await expect(bkash(randomUUID(), 'ABC123XYZ')).rejects.toMatchObject({
      code: 'TRX_ID_ALREADY_USED',
      status: 409,
    });
    // a different payment for the same order is refused
    await expect(bkash(order, 'OTHER9999')).rejects.toMatchObject({
      code: 'PAYMENT_ALREADY_EXISTS',
    });
  });

  it('void (compensation) frees the trxId; rejection keeps it blocked', async () => {
    const order = randomUUID();
    await bkash(order, 'FREEME1234');
    expect(await payments.voidForOrder({ orderId: order, reason: 'COMPENSATION' })).toEqual({
      voided: true,
    });
    expect(await payments.voidForOrder({ orderId: order, reason: 'COMPENSATION' })).toEqual({
      voided: false,
    });
    await expect(bkash(randomUUID(), 'FREEME1234')).resolves.toMatchObject({ status: 'SUBMITTED' });

    const rejectedOrder = randomUUID();
    const p = await bkash(rejectedOrder, 'FAKE777777');
    await payments.reject({ paymentId: p.id, rejectedBy: admin, reason: 'not received' });
    await expect(bkash(randomUUID(), 'FAKE777777')).rejects.toMatchObject({
      code: 'TRX_ID_ALREADY_USED',
    });
    // the customer may resubmit a new trxId for the same order after rejection
    await expect(bkash(rejectedOrder, 'REAL888888')).resolves.toMatchObject({
      status: 'SUBMITTED',
    });
  });

  it('verify checks the amount and emits payment.verified; COD confirm does too', async () => {
    const order = randomUUID();
    const p = await bkash(order, 'VERIFY1234');
    await expect(
      payments.verify({ paymentId: p.id, verifiedBy: admin, amountReceivedPaisa: 20000 }),
    ).rejects.toMatchObject({ code: 'AMOUNT_MISMATCH' });
    await expect(
      payments.verify({ paymentId: p.id, verifiedBy: admin, amountReceivedPaisa: 30000 }),
    ).resolves.toMatchObject({ status: 'VERIFIED' });
    await expect(
      payments.verify({ paymentId: p.id, verifiedBy: admin, amountReceivedPaisa: 30000 }),
    ).rejects.toMatchObject({ code: 'INVALID_PAYMENT_TRANSITION' });

    const codOrder = randomUUID();
    const cod = await payments.create({
      orderId: codOrder,
      orderCode: 'ZQ-TEST33',
      method: 'COD',
      kind: 'COD',
      amountPaisa: 366000,
    });
    await expect(
      payments.confirmCod({ paymentId: cod.id, confirmedBy: admin }),
    ).resolves.toMatchObject({ status: 'COD_CONFIRMED' });

    const verified = await db.outboxEvent.findMany({ where: { type: 'payment.verified' } });
    expect(verified.map((e) => (e.payload as { orderId: string }).orderId).sort()).toEqual(
      [order, codOrder].sort(),
    );
  });

  it('the database enforces one open payment per order', async () => {
    const order = randomUUID();
    await bkash(order, 'ONLYONE111');
    await expect(
      db.payment.create({
        data: {
          orderId: order,
          orderCode: 'ZQ-X',
          method: 'COD',
          kind: 'COD',
          status: 'COD_PENDING',
          amountPaisa: 1,
        },
      }),
    ).rejects.toThrow();
  });
});
