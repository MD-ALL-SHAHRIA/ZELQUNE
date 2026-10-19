import { z } from 'zod';
import { actorSchema } from '../audit/audit.contracts';
import { defineEvent } from './envelope';

/**
 * Every admin change, written by the owning service in the same transaction as the change.
 * analytics-service keeps them as the audit log. `changes` must not contain secrets.
 */
export const auditRecorded = defineEvent({
  type: 'audit.recorded',
  version: 1,
  payload: z.object({
    actor: actorSchema,
    /** `<entity>.<verb>`, e.g. "payment.verify", "order.transition", "product.update". */
    action: z.string().regex(/^[a-z][a-zA-Z]*\.[a-z][a-zA-Z]*$/),
    entityType: z.string().min(1).max(40),
    entityId: z.string().min(1).max(64),
    summary: z.string().max(300),
    changes: z.record(z.string(), z.unknown()).nullable(),
  }),
});
