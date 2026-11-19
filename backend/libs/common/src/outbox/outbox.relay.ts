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

/** How long a claimed row stays hidden from other relays while it is being published. */
export const CLAIM_LEASE_MS = 60_000;

/**
 * Polls `outbox_events` and publishes unpublished rows in order. A batch is claimed in one
 * statement (FOR UPDATE SKIP LOCKED inside an UPDATE that pushes `next_attempt_at` out by a
 * lease), so no database transaction stays open while RabbitMQ is being called, and several
 * replicas can run safely. A relay that dies mid-batch leaves its rows to be picked up again
 * when the lease runs out. Delivery is at-least-once; consumers dedupe via EventConsumer.
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
    const rows = await this.db.$queryRaw<OutboxRow[]>`
      UPDATE outbox_events SET next_attempt_at = ${new Date(Date.now() + CLAIM_LEASE_MS)}
      WHERE id IN (
        SELECT id FROM outbox_events
        WHERE published_at IS NULL AND next_attempt_at <= now()
        ORDER BY occurred_at, id
        LIMIT ${this.options.batchSize}
        FOR UPDATE SKIP LOCKED)
      RETURNING id, type, version, source, payload, request_id, occurred_at, attempts`;
    // RETURNING has no order of its own.
    rows.sort(
      (a, b) =>
        new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime() ||
        a.id.localeCompare(b.id),
    );

    let published = 0;
    for (const [i, row] of rows.entries()) {
      try {
        await this.publisher.publish(toEnvelope(row));
      } catch (err) {
        const attempts = row.attempts + 1;
        const message = err instanceof Error ? err.message : String(err);
        const retryAt = new Date(Date.now() + retryDelayMs(attempts));
        await this.db.$executeRaw`
          UPDATE outbox_events
          SET attempts = ${attempts}, last_error = ${message}, next_attempt_at = ${retryAt}
          WHERE id = ${row.id}::uuid`;
        // The rest of the batch waits with it, so the failed event still goes out first.
        const rest = rows.slice(i + 1).map((r) => r.id);
        if (rest.length)
          await this.db.$executeRaw`
            UPDATE outbox_events SET next_attempt_at = ${retryAt}
            WHERE id = ANY(${rest}::uuid[])`;
        this.logger.warn(`Outbox publish failed for ${row.type} ${row.id}: ${message}`);
        break;
      }
      await this.db.$executeRaw`
        UPDATE outbox_events
        SET published_at = now(), attempts = ${row.attempts + 1}, last_error = NULL
        WHERE id = ${row.id}::uuid`;
      published++;
    }
    return published;
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
