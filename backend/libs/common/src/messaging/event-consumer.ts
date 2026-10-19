import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { type EventEnvelope, parseEnvelope } from '@zelqune/contracts';
import { type ConfirmChannel, type ConsumeMessage } from 'amqplib';
import { randomUUID } from 'node:crypto';
import { requestContext } from '../context/request-context';
import { TRANSACTIONAL_DB, type SqlExecutor, type TransactionalDb } from '../db/db.types';
import {
  MESSAGING_OPTIONS,
  type MessagingOptions,
  RabbitMqConnection,
} from './rabbitmq.connection';
import { decideFailureAction, retryCountOf } from './retry-policy';
import { EVENTS_EXCHANGE, RETRY_COUNT_HEADER, serviceQueues } from './topology';

/**
 * Runs inside the same DB transaction that records the event as processed. `tx` is the
 * service's Prisma transaction client (typed minimally here); services may narrow it.
 */
export type EventHandler = (event: EventEnvelope, tx: SqlExecutor) => Promise<void>;

interface RegisteredHandler {
  name: string;
  handle: EventHandler;
}

export type HandleResult = { handler: string; outcome: 'processed' | 'duplicate' }[];

const PREFETCH = 10;

/**
 * Idempotent consumer. Each (event id, handler) pair is recorded in `processed_events` in the
 * handler's own transaction, so redelivered events are skipped. Transient failures are retried
 * through delay queues (EVENT_RETRY_DELAYS_MS); malformed messages, NonRetryableError and
 * exhausted retries land in `<service>.events.dlq` for inspection/replay (ADR 0009).
 */
@Injectable()
export class EventConsumer implements OnApplicationBootstrap {
  private readonly logger = new Logger(EventConsumer.name);
  private readonly handlers = new Map<string, RegisteredHandler[]>();

  constructor(
    private readonly connection: RabbitMqConnection,
    @Inject(TRANSACTIONAL_DB) private readonly db: TransactionalDb,
    @Inject(MESSAGING_OPTIONS) private readonly options: MessagingOptions,
  ) {}

  /** Register during `onModuleInit`; `handlerName` must be stable (it is the dedupe key). */
  subscribe(eventType: string, handlerName: string, handle: EventHandler): void {
    const list = this.handlers.get(eventType) ?? [];
    if (list.some((h) => h.name === handlerName)) {
      throw new Error(`Handler "${handlerName}" already subscribed to ${eventType}`);
    }
    list.push({ name: handlerName, handle });
    this.handlers.set(eventType, list);
  }

  async onApplicationBootstrap(): Promise<void> {
    if (this.handlers.size === 0) return;
    const { queue } = serviceQueues(this.options.serviceName, this.options.retryDelaysMs);
    await this.connection.channel.addSetup(async (channel: ConfirmChannel) => {
      for (const eventType of this.handlers.keys()) {
        await channel.bindQueue(queue, EVENTS_EXCHANGE, eventType);
      }
      await channel.prefetch(PREFETCH);
      await channel.consume(queue, (msg) => {
        if (msg) void this.onMessage(channel, msg);
      });
    });
  }

  /** Parses and dispatches one raw message to every handler of its type. */
  async handle(raw: Buffer): Promise<HandleResult> {
    const event = parseEnvelope(JSON.parse(raw.toString('utf8')));
    const handlers = this.handlers.get(event.type) ?? [];
    const results: HandleResult = [];

    for (const handler of handlers) {
      const outcome = await requestContext.run({ requestId: event.requestId ?? randomUUID() }, () =>
        this.db.transaction(async (tx) => {
          const inserted = await tx.$executeRaw`
            INSERT INTO processed_events (event_id, handler, event_type)
            VALUES (${event.id}::uuid, ${handler.name}, ${event.type})
            ON CONFLICT DO NOTHING`;
          if (inserted === 0) return 'duplicate' as const;
          await handler.handle(event, tx);
          return 'processed' as const;
        }),
      );
      results.push({ handler: handler.name, outcome });
    }
    return results;
  }

  private async onMessage(channel: ConfirmChannel, msg: ConsumeMessage): Promise<void> {
    try {
      await this.handle(msg.content);
      channel.ack(msg);
    } catch (err) {
      await this.onFailure(channel, msg, err);
    }
  }

  private async onFailure(
    channel: ConfirmChannel,
    msg: ConsumeMessage,
    err: unknown,
  ): Promise<void> {
    const headers = msg.properties.headers;
    const { retryQueues } = serviceQueues(this.options.serviceName, this.options.retryDelaysMs);
    const action = decideFailureAction(err, retryCountOf(headers), retryQueues);
    const context = {
      err,
      messageId: msg.properties.messageId as unknown,
      eventType: msg.properties.type as unknown,
      routingKey: msg.fields.routingKey,
    };

    if (action.kind === 'retry') {
      try {
        // Publish the copy (with broker confirm) BEFORE acking the original: never lose it.
        await publishConfirmed(channel, action.queue, msg, {
          ...headers,
          [RETRY_COUNT_HEADER]: action.attempt,
        });
        channel.ack(msg);
        this.logger.warn(
          context,
          `Event handling failed; retry ${action.attempt}/${retryQueues.length} via ${action.queue}`,
        );
        return;
      } catch (publishErr) {
        this.logger.error({ ...context, publishErr }, 'Could not schedule retry; dead-lettering');
      }
    } else {
      this.logger.error(
        context,
        `Event handling failed (${action.reason}); dead-lettering message`,
      );
    }
    channel.nack(msg, false, false);
  }
}

function publishConfirmed(
  channel: ConfirmChannel,
  queue: string,
  msg: ConsumeMessage,
  headers: Record<string, unknown>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    channel.publish(
      '',
      queue,
      msg.content,
      { ...msg.properties, headers, persistent: true },
      (err) => (err ? reject(err instanceof Error ? err : new Error(String(err))) : resolve()),
    );
  });
}
