import { type Actor, auditRecorded, SYSTEM_ACTOR } from '@zelqune/contracts';
import { requestContext } from '../context/request-context';
import { type SqlExecutor } from '../db/db.types';
import { type OutboxService } from '../outbox/outbox.service';

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  changes?: Record<string, unknown> | null;
  /** Defaults to the request's actor, else SYSTEM. */
  actor?: Actor;
}

/**
 * Writes `audit.recorded` to the outbox inside the caller's transaction, so the audit entry
 * exists if and only if the change committed.
 */
export async function recordAudit(
  outbox: OutboxService,
  tx: SqlExecutor,
  source: string,
  entry: AuditEntry,
): Promise<void> {
  const actor = entry.actor ?? requestContext.actor() ?? SYSTEM_ACTOR;
  await outbox.add(
    tx,
    auditRecorded.create(
      {
        actor,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        summary: entry.summary.slice(0, 300),
        changes: entry.changes ?? null,
      },
      { source, requestId: requestContext.requestId() },
    ),
  );
}

/** Current admin or SYSTEM, for "who did it" fields stored by services. */
export function currentActor(): Actor {
  return requestContext.actor() ?? SYSTEM_ACTOR;
}
