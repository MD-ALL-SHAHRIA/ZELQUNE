import { z } from 'zod';
import { decideFailureAction, NonRetryableError, retryCountOf } from './retry-policy';
import { serviceQueues } from './topology';

describe('event retry policy', () => {
  const { retryQueues } = serviceQueues('order-service', [5000, 30000, 120000]);

  it('names retry queues after their delay', () => {
    expect(retryQueues.map((q) => q.name)).toEqual([
      'order-service.events.retry.5000ms',
      'order-service.events.retry.30000ms',
      'order-service.events.retry.120000ms',
    ]);
  });

  it('retries transient errors through each delay queue, then dead-letters', () => {
    const err = new Error('connection reset');
    expect(decideFailureAction(err, 0, retryQueues)).toEqual({
      kind: 'retry',
      attempt: 1,
      queue: retryQueues[0].name,
    });
    expect(decideFailureAction(err, 2, retryQueues)).toEqual({
      kind: 'retry',
      attempt: 3,
      queue: retryQueues[2].name,
    });
    expect(decideFailureAction(err, 3, retryQueues)).toEqual({
      kind: 'dead-letter',
      reason: 'retries-exhausted',
    });
  });

  it('dead-letters malformed and non-retryable messages immediately', () => {
    expect(decideFailureAction(new NonRetryableError('bad'), 0, retryQueues).kind).toBe(
      'dead-letter',
    );
    expect(decideFailureAction(new SyntaxError('Unexpected token'), 0, retryQueues).kind).toBe(
      'dead-letter',
    );
    expect(decideFailureAction(z.string().safeParse(1).error, 0, retryQueues).kind).toBe(
      'dead-letter',
    );
  });

  it('with no retry delays configured, everything dead-letters', () => {
    expect(decideFailureAction(new Error('x'), 0, [])).toEqual({
      kind: 'dead-letter',
      reason: 'retries-exhausted',
    });
  });

  it('reads the retry count header defensively', () => {
    expect(retryCountOf({ 'x-retry-count': 2 })).toBe(2);
    expect(retryCountOf({ 'x-retry-count': 'nope' })).toBe(0);
    expect(retryCountOf(undefined)).toBe(0);
  });
});
