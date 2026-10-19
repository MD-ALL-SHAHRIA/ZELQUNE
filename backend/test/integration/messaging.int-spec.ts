import { type EventEnvelope } from '@zelqune/contracts';
import { connect } from 'amqplib';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { EventConsumer } from '../../libs/common/src/messaging/event-consumer';
import { EventPublisher } from '../../libs/common/src/messaging/event-publisher';
import { RabbitMqConnection } from '../../libs/common/src/messaging/rabbitmq.connection';
import { NonRetryableError } from '../../libs/common/src/messaging/retry-policy';
import { serviceQueues } from '../../libs/common/src/messaging/topology';
import { FakeSql } from '../../libs/common/src/testing/fake-sql';
import { defineEvent } from '../../libs/contracts/src/events/envelope';
import { IT } from './it-env';

const testHappened = defineEvent({
  type: 'test.happened',
  version: 1,
  payload: z.object({ n: z.number() }),
});

async function until(cond: () => boolean, ms = 10_000): Promise<void> {
  const end = Date.now() + ms;
  while (!cond() && Date.now() < end) await new Promise((r) => setTimeout(r, 50));
}

describe('event consumer retries on real RabbitMQ', () => {
  const serviceName = `it-retry-${randomUUID().slice(0, 8)}`;
  const retryDelaysMs = [100, 200];
  const options = { url: IT.rabbitUrl, serviceName, retryDelaysMs };
  let connection: RabbitMqConnection;
  let publisher: EventPublisher;
  let consumer: EventConsumer;
  const calls: { n: number; attempt: number }[] = [];
  const failuresBeforeSuccess = new Map<number, number>();

  beforeAll(async () => {
    connection = new RabbitMqConnection(options);
    connection.onModuleInit();
    await connection.channel.waitForConnect();
    publisher = new EventPublisher(connection);
    consumer = new EventConsumer(connection, new FakeSql(), options);
    consumer.subscribe('test.happened', 'retryProbe', (event: EventEnvelope) => {
      const { n } = event.payload as { n: number };
      const seen = calls.filter((c) => c.n === n).length;
      calls.push({ n, attempt: seen + 1 });
      if (n === 99) return Promise.reject(new NonRetryableError('poison'));
      if (seen < (failuresBeforeSuccess.get(n) ?? 0)) return Promise.reject(new Error('transient'));
      return Promise.resolve();
    });
    await consumer.onApplicationBootstrap();
  });

  afterAll(async () => {
    const conn = await connect(IT.rabbitUrl);
    const ch = await conn.createChannel();
    const q = serviceQueues(serviceName, retryDelaysMs);
    for (const name of [q.queue, q.deadLetterQueue, ...q.retryQueues.map((r) => r.name)])
      await ch.deleteQueue(name);
    await conn.close();
    await connection.onModuleDestroy();
  });

  const send = (n: number) => publisher.publish(testHappened.create({ n }, { source: 'it' }));

  it('retries a transient failure through the delay queues and processes it once', async () => {
    failuresBeforeSuccess.set(1, 2);
    await send(1);
    await until(() => calls.filter((c) => c.n === 1).length >= 3);
    await new Promise((r) => setTimeout(r, 500)); // nothing more arrives
    expect(calls.filter((c) => c.n === 1).map((c) => c.attempt)).toEqual([1, 2, 3]);
  });

  it('dead-letters after exhausting retries', async () => {
    failuresBeforeSuccess.set(2, 10);
    await send(2);
    await until(() => calls.filter((c) => c.n === 2).length >= 3);
    const conn = await connect(IT.rabbitUrl);
    const ch = await conn.createChannel();
    const dlq = serviceQueues(serviceName).deadLetterQueue;
    let message: Awaited<ReturnType<typeof ch.get>> = false;
    const end = Date.now() + 5000;
    while (!message && Date.now() < end) {
      message = await ch.get(dlq, { noAck: true });
      if (!message) await new Promise((r) => setTimeout(r, 100));
    }
    await conn.close();
    expect(calls.filter((c) => c.n === 2)).toHaveLength(3); // 1 try + 2 retries
    expect(message && JSON.parse(message.content.toString()).payload).toEqual({ n: 2 });
    expect(message && message.properties.headers?.['x-retry-count']).toBe(2);
  });

  it('dead-letters NonRetryableError immediately', async () => {
    await send(99);
    await until(() => calls.some((c) => c.n === 99));
    await new Promise((r) => setTimeout(r, 600));
    expect(calls.filter((c) => c.n === 99)).toHaveLength(1);
  });
});
