import { Injectable } from '@nestjs/common';
import { type EventEnvelope, parseEnvelope } from '@zelqune/contracts';
import { type SqlExecutor } from '../db/db.types';

/**
 * Writes an event to the service's `outbox_events` table. Always pass the transaction client
 * of the business write so both commit or roll back together.
 */
@Injectable()
export class OutboxService {
  async add(tx: SqlExecutor, event: EventEnvelope): Promise<void> {
    const valid = parseEnvelope(event);
    await tx.$executeRaw`
      INSERT INTO outbox_events (id, type, version, source, payload, request_id, occurred_at)
      VALUES (${valid.id}::uuid, ${valid.type}, ${valid.version}, ${valid.source},
              ${JSON.stringify(valid.payload ?? null)}::jsonb, ${valid.requestId ?? null},
              ${new Date(valid.occurredAt)})`;
  }
}
