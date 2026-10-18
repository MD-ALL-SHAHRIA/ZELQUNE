import { type ConfirmChannel } from 'amqplib';

/** All domain events go to one durable topic exchange; routing key = event type. */
export const EVENTS_EXCHANGE = 'zelqune.events';
export const DEAD_LETTER_EXCHANGE = 'zelqune.events.dlx';

export function serviceQueues(serviceName: string): { queue: string; deadLetterQueue: string } {
  return { queue: `${serviceName}.events`, deadLetterQueue: `${serviceName}.events.dlq` };
}

/** Idempotent: safe to run on every (re)connect. */
export async function assertTopology(channel: ConfirmChannel, serviceName: string): Promise<void> {
  const { queue, deadLetterQueue } = serviceQueues(serviceName);
  await channel.assertExchange(EVENTS_EXCHANGE, 'topic', { durable: true });
  await channel.assertExchange(DEAD_LETTER_EXCHANGE, 'direct', { durable: true });
  await channel.assertQueue(deadLetterQueue, { durable: true });
  await channel.bindQueue(deadLetterQueue, DEAD_LETTER_EXCHANGE, queue);
  await channel.assertQueue(queue, {
    durable: true,
    deadLetterExchange: DEAD_LETTER_EXCHANGE,
    deadLetterRoutingKey: queue,
  });
}
