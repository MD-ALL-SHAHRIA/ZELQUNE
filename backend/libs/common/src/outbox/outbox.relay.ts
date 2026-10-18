import {
  Inject,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { type EventEnvelope } from '@zelqune/contracts';
import { TRANSACTIONAL_DB, type TransactionalDb } from '../db/db.types';
import { EventPublisher } from '../messaging/event-publisher';

export interface OutboxRelayOptions {
  pollIntervalMs: number;
  batchSize: number;
  /** Start polling on application bootstrap (disable in tests). */
  autoStart: boolean;
}

export const OUTBOX_RELAY_OPTIONS = Symbol('OUTBOX_RELAY_OPTIONS');

interface OutboxRow {
  id: string;
  type: string;
  version: number;
  source: string;
  payload: unknown;
  request_id: string | null;
  occurred_at: Date;
  attempts: number;
}

const MAX_BACKOFF_MS = 5 * 60 * 1000;

export function retryDelayMs(attempts: number): number {
  return Math.min(1000 * 2 ** Math.max(0, attempts - 1), MAX_BACKOFF_MS);
}

/**
 * Polls `outbox_events` and publishes unpublished rows in order. Rows are claimed with
 * FOR UPDATE SKIP LOCKED, so several replicas can run safely. Delivery is at-least-once;
 * consumers dedupe via EventConsumer.
 */
@Injectable()
export class OutboxRelay implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(OutboxRelay.name);
  private timer?: NodeJS.Timeout;
  private stopped = false;

  constructor(
    @Inject(TRANSACTIONAL_DB) private readonly db: TransactionalDb,
    private readonly publisher: EventPublisher,
    @Inject(OUTBOX_RELAY_OPTIONS) private readonly options: OutboxRelayOptions,
  ) {}

  onApplicationBootstrap(): void {
    if (this.options.autoStart) this.schedule();
  }

  onModuleDestroy(): void {
    this.stopped = true;
    clearTimeout(this.timer);
  }

  /** Publishes one batch. Returns how many rows were published; stops at the first failure. */
  async relayBatch(): Promise<number> {
    return this.db.transaction(async (tx) => {
      const rows = await tx.$queryRaw<OutboxRow[]>`
        SELECT id, type, version, source, payload, request_id, occurred_at, attempts
        FROM outbox_events
        WHERE published_at IS NULL AND next_attempt_at <= now()
        ORDER BY occurred_at, id
        LIMIT ${this.options.batchSize}
        FOR UPDATE SKIP LOCKED`;

      let published = 0;
      for (const row of rows) {
        try {
          await this.publisher.publish(toEnvelope(row));
        } catch (err) {
          const attempts = row.attempts + 1;
          const message = err instanceof Error ? err.message : String(err);
          await tx.$executeRaw`
            UPDATE outbox_events
            SET attempts = ${attempts}, last_error = ${message},
                next_attempt_at = ${new Date(Date.now() + retryDelayMs(attempts))}
            WHERE id = ${row.id}::uuid`;
          this.logger.warn(`Outbox publish failed for ${row.type} ${row.id}: ${message}`);
          break;
        }
        await tx.$executeRaw`
          UPDATE outbox_events
          SET published_at = now(), attempts = ${row.attempts + 1}, last_error = NULL
          WHERE id = ${row.id}::uuid`;
        published++;
      }
      return published;
    });
  }

  private schedule(): void {
    this.timer = setTimeout(() => void this.tick(), this.options.pollIntervalMs);
  }

  private async tick(): Promise<void> {
    try {
      // Drain while full batches keep succeeding.
      while (!this.stopped && (await this.relayBatch()) === this.options.batchSize) {
        /* keep draining */
      }
    } catch (err) {
      this.logger.error({ err }, 'Outbox relay tick failed');
    } finally {
      if (!this.stopped) this.schedule();
    }
  }
}

function toEnvelope(row: OutboxRow): EventEnvelope {
  return {
    id: row.id,
    type: row.type,
    version: row.version,
    source: row.source,
    occurredAt: new Date(row.occurred_at).toISOString(),
    payload: row.payload,
    ...(row.request_id ? { requestId: row.request_id } : {}),
  };
}
