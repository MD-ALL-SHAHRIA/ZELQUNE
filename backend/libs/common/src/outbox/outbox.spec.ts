import { type EventEnvelope } from '@zelqune/contracts';
import { type EventPublisher } from '../messaging/event-publisher';
import { FakeSql } from '../testing/fake-sql';
import { OutboxRelay, retryDelayMs } from './outbox.relay';
import { OutboxService } from './outbox.service';

const event: EventEnvelope = {
  id: '6f1c1d1e-8a43-4a43-9a8b-4b0b3c1c2d3e',
  type: 'sample.created',
  version: 1,
  occurredAt: '2026-10-19T00:00:00.000Z',
  source: 'test-service',
  requestId: 'req-1',
  payload: { amountPaisa: 349000 },
};

const row = (id: string, attempts = 0) => ({
  id,
  type: 'sample.created',
  version: 1,
  source: 'test-service',
  payload: { n: id },
  request_id: 'req-1',
  occurred_at: new Date('2026-10-19T00:00:00Z'),
  attempts,
});

describe('OutboxService', () => {
  it('inserts the envelope through the caller transaction', async () => {
    const tx = new FakeSql();
    await new OutboxService().add(tx, event);
    const [insert] = tx.sqlStartingWith('INSERT INTO outbox_events');
    expect(insert.values).toEqual([
      event.id,
      'sample.created',
      1,
      'test-service',
      JSON.stringify(event.payload),
      'req-1',
      new Date(event.occurredAt),
    ]);
  });

  it('rejects invalid envelopes before touching the database', async () => {
    const tx = new FakeSql();
    await expect(new OutboxService().add(tx, { ...event, type: 'Bad' })).rejects.toThrow();
    expect(tx.queries).toHaveLength(0);
  });
});

describe('OutboxRelay', () => {
  const publish = jest.fn<Promise<void>, [EventEnvelope]>();
  const publisher = { publish } as unknown as EventPublisher;
  const options = { pollIntervalMs: 1000, batchSize: 10, autoStart: false };

  beforeEach(() => publish.mockReset());

  it('claims rows with SKIP LOCKED, publishes in order and marks them published', async () => {
    const db = new FakeSql();
    db.queryResults.push([row('a'), row('b')]);
    publish.mockResolvedValue();

    await expect(new OutboxRelay(db, publisher, options).relayBatch()).resolves.toBe(2);

    expect(db.queries[0].sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(publish.mock.calls.map(([e]) => e.payload)).toEqual([{ n: 'a' }, { n: 'b' }]);
    expect(publish.mock.calls[0][0]).toMatchObject({ requestId: 'req-1', type: 'sample.created' });
    expect(db.sqlStartingWith('UPDATE outbox_events SET published_at')).toHaveLength(2);
    expect(db.commits).toBe(1);
  });

  it('stops at the first failure and schedules a retry with backoff', async () => {
    const db = new FakeSql();
    db.queryResults.push([row('a', 2), row('b')]);
    publish.mockRejectedValueOnce(new Error('broker down'));

    await expect(new OutboxRelay(db, publisher, options).relayBatch()).resolves.toBe(0);

    expect(publish).toHaveBeenCalledTimes(1);
    const [failure] = db.sqlStartingWith('UPDATE outbox_events SET attempts');
    expect(failure.values.slice(0, 2)).toEqual([3, 'broker down']);
    expect(db.sqlStartingWith('UPDATE outbox_events SET published_at')).toHaveLength(0);
  });

  it('backs off exponentially up to 5 minutes', () => {
    expect([1, 2, 3, 4].map(retryDelayMs)).toEqual([1000, 2000, 4000, 8000]);
    expect(retryDelayMs(30)).toBe(5 * 60 * 1000);
  });
});
