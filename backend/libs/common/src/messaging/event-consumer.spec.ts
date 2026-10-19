import { type EventEnvelope } from '@zelqune/contracts';
import { requestContext } from '../context/request-context';
import { FakeSql } from '../testing/fake-sql';
import { EventConsumer } from './event-consumer';
import { type RabbitMqConnection } from './rabbitmq.connection';

const event: EventEnvelope = {
  id: '6f1c1d1e-8a43-4a43-9a8b-4b0b3c1c2d3e',
  type: 'sample.created',
  version: 1,
  occurredAt: '2026-10-19T00:00:00.000Z',
  source: 'other-service',
  requestId: 'req-42',
  payload: {},
};
const raw = Buffer.from(JSON.stringify(event));

describe('EventConsumer', () => {
  const connection = {} as RabbitMqConnection;
  const setup = () => {
    const db = new FakeSql();
    const consumer = new EventConsumer(connection, db, {
      url: 'amqp://x',
      serviceName: 'test',
      retryDelaysMs: [],
    });
    return { db, consumer };
  };

  it('records the event and runs the handler in the same transaction with the request id', async () => {
    const { db, consumer } = setup();
    const seen: string[] = [];
    consumer.subscribe('sample.created', 'projectSample', (_e, tx) => {
      seen.push(requestContext.requestId() ?? 'none');
      expect(tx).toBe(db);
      return Promise.resolve();
    });

    await expect(consumer.handle(raw)).resolves.toEqual([
      { handler: 'projectSample', outcome: 'processed' },
    ]);
    expect(seen).toEqual(['req-42']);
    const [insert] = db.sqlStartingWith('INSERT INTO processed_events');
    expect(insert.values).toEqual([event.id, 'projectSample', 'sample.created']);
  });

  it('skips duplicates (already in processed_events)', async () => {
    const { db, consumer } = setup();
    const handler = jest.fn().mockResolvedValue(undefined);
    consumer.subscribe('sample.created', 'projectSample', handler);
    db.executeResults.push(0);

    await expect(consumer.handle(raw)).resolves.toEqual([
      { handler: 'projectSample', outcome: 'duplicate' },
    ]);
    expect(handler).not.toHaveBeenCalled();
  });

  it('rolls back the dedupe row when the handler fails', async () => {
    const { db, consumer } = setup();
    consumer.subscribe('sample.created', 'projectSample', () => Promise.reject(new Error('boom')));
    await expect(consumer.handle(raw)).rejects.toThrow('boom');
    expect(db.rollbacks).toBe(1);
  });

  it('rejects malformed messages and duplicate handler names', async () => {
    const { consumer } = setup();
    await expect(consumer.handle(Buffer.from('{"nope":true}'))).rejects.toThrow();
    consumer.subscribe('sample.created', 'h', () => Promise.resolve());
    expect(() => consumer.subscribe('sample.created', 'h', () => Promise.resolve())).toThrow(
      /already subscribed/,
    );
  });
});
