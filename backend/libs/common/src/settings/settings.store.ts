import { type z } from 'zod';
import { recordAudit, currentActor } from '../audit/audit';
import { type SqlExecutor } from '../db/db.types';
import { type OutboxService } from '../outbox/outbox.service';

export interface SettingView<T> {
  value: T;
  meta: { updatedAt: string | null; updatedBy: string | null };
}

interface Row {
  value: unknown;
  updated_at: Date;
  updated_by: string | null;
}

/**
 * Owner-editable settings (ADR 0017): one JSON row per key in the service's own `settings`
 * table. Until a key is saved, `defaults` (from the service env) apply; a stored value that no
 * longer validates also falls back to them, so a bad row can never break checkout.
 */
export class SettingsStore<S extends z.ZodType> {
  constructor(
    private readonly db: SqlExecutor & {
      $transaction<R>(fn: (tx: SqlExecutor) => Promise<R>): Promise<R>;
    },
    private readonly outbox: OutboxService,
    private readonly source: string,
    private readonly key: string,
    private readonly schema: S,
    private readonly defaults: () => z.output<S>,
  ) {}

  async get(): Promise<SettingView<z.output<S>>> {
    const [row] = await this.db.$queryRaw<Row[]>`
      SELECT value, updated_at, updated_by FROM settings WHERE key = ${this.key}`;
    const parsed = row ? this.schema.safeParse(row.value) : null;
    return parsed?.success
      ? {
          value: parsed.data,
          meta: { updatedAt: row.updated_at.toISOString(), updatedBy: row.updated_by },
        }
      : { value: this.defaults(), meta: { updatedAt: null, updatedBy: null } };
  }

  async value(): Promise<z.output<S>> {
    return (await this.get()).value;
  }

  async update(raw: unknown): Promise<SettingView<z.output<S>>> {
    const value = this.schema.parse(raw);
    const actor = currentActor();
    const json = JSON.stringify(value);
    await this.db.$transaction(async (tx) => {
      await tx.$executeRaw`
        INSERT INTO settings (key, value, updated_at, updated_by)
        VALUES (${this.key}, ${json}::jsonb, now(), ${actor.id})
        ON CONFLICT (key) DO UPDATE
          SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by`;
      await recordAudit(this.outbox, tx, this.source, {
        action: 'settings.update',
        entityType: 'settings',
        entityId: this.key,
        summary: `Settings changed: ${this.key}`,
        changes: value as Record<string, unknown>,
      });
    });
    return this.get();
  }
}
