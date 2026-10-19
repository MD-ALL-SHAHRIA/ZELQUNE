import { z } from 'zod';
import { ROLES } from '../auth/auth.contracts';

/** Who did something: an admin from the JWT, or the system (sweepers, seed, consumers). */
export const actorSchema = z.object({
  id: z.string().min(1).max(64),
  role: z.enum([...ROLES, 'SYSTEM']),
});
export type Actor = z.infer<typeof actorSchema>;
export const SYSTEM_ACTOR: Actor = { id: 'system', role: 'SYSTEM' };

export const auditLogQuerySchema = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  entityType: z.string().max(40).optional(),
  entityId: z.string().max(64).optional(),
  actorId: z.string().max(64).optional(),
  action: z.string().max(60).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type AuditLogQuery = z.output<typeof auditLogQuerySchema>;

export const auditLogEntrySchema = z.object({
  id: z.uuid(),
  occurredAt: z.string(),
  source: z.string(),
  actor: actorSchema,
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  summary: z.string(),
  changes: z.record(z.string(), z.unknown()).nullable(),
  requestId: z.string().nullable(),
});
export const auditLogPageSchema = z.object({
  items: z.array(auditLogEntrySchema),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
});
export type AuditLogPage = z.infer<typeof auditLogPageSchema>;
