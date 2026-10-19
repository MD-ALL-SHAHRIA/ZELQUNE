import { type ConfirmChannel } from 'amqplib';

/** All domain events go to one durable topic exchange; routing key = event type. */
export const EVENTS_EXCHANGE = 'zelqune.events';
export const DEAD_LETTER_EXCHANGE = 'zelqune.events.dlx';
/** Header carrying how many times a message has already been retried. */
export const RETRY_COUNT_HEADER = 'x-retry-count';

export interface ServiceQueues {
  queue: string;
  deadLetterQueue: string;
  /** One delay queue per retry attempt, in order. */
  retryQueues: { name: string; delayMs: number }[];
}

/**
 * Retry queues are named after their delay so changing EVENT_RETRY_DELAYS_MS never conflicts
 * with an existing queue's arguments.
 */
export function serviceQueues(serviceName: string, retryDelaysMs: number[] = []): ServiceQueues {
  const queue = `${serviceName}.events`;
  return {
    queue,
    deadLetterQueue: `${queue}.dlq`,
    retryQueues: retryDelaysMs.map((delayMs) => ({ name: `${queue}.retry.${delayMs}ms`, delayMs })),
  };
}

/**
 * Idempotent: safe to run on every (re)connect.
 *
 *   zelqune.events (topic) ──► <svc>.events ──(nack after last retry)──► dlx ──► <svc>.events.dlq
 *                                  ▲    │ failure: republish via default exchange
 *                                  │    ▼
 *                                  └── <svc>.events.retry.<delay>ms  (TTL, then dead-letters back)
 */
export async function assertTopology(
  channel: ConfirmChannel,
  serviceName: string,
  retryDelaysMs: number[] = [],
): Promise<void> {
  const { queue, deadLetterQueue, retryQueues } = serviceQueues(serviceName, retryDelaysMs);
  await channel.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'direct', { durable: true });
  await channel.assertQueue(deadLetterQueue, { durable: true });
  await channel.bindQueue(deadLetterQueue, DEAD_LETTER_EXCHANGE, queue);
  await channel.assertQueue(queue, {
    durable: true,
    deadLetterExchange: DEAD_LETTER_EXCHANGE,
    deadLetterRoutingKey: queue,
  });
  for (const retry of retryQueues) {
    await channel.assertQueue(retry.name, {
      durable: true,
      messageTtl: retry.delayMs,
      // default exchange routes by queue name: expired messages go back to the main queue
      deadLetterExchange: '',
      deadLetterRoutingKey: queue,
    });
  }
}
