import { z } from 'zod';
import { type SqlExecutor } from '../db/db.types';
import { type OutboxService } from '../outbox/outbox.service';
import { SettingsStore } from './settings.store';

const schema = z.object({ fee: z.number().int().min(0) });

function fakeDb(row: { value: unknown } | null) {
  const executed: string[] = [];
  type Db = SqlExecutor & { $transaction<R>(fn: (tx: SqlExecutor) => Promise<R>): Promise<R> };
  const db: Db = {
    $queryRaw: <T>() =>
      Promise.resolve(
        (row ? [{ ...row, updated_at: new Date(0), updated_by: 'owner-1' }] : []) as T,
      ),
    $executeRaw: (q: TemplateStringsArray) => {
      executed.push(q.join('?'));
      return Promise.resolve(1);
    },
    $transaction: (fn) => fn(db),
  };
  return { db, executed };
}
const outbox = { add: jest.fn().mockResolvedValue(undefined) } as unknown as OutboxService;

describe('SettingsStore', () => {
  it('uses the env defaults until the owner saves', async () => {
    const store = new SettingsStore(fakeDb(null).db, outbox, 'svc', 'k', schema, () => ({
      fee: 70,
    }));
    await expect(store.get()).resolves.toEqual({
      value: { fee: 70 },
      meta: { updatedAt: null, updatedBy: null },
    });
  });

  it('prefers the saved value and ignores a row that no longer validates', async () => {
    const saved = new SettingsStore(
      fakeDb({ value: { fee: 90 } }).db,
      outbox,
      's',
      'k',
      schema,
      () => ({ fee: 70 }),
    );
    expect(await saved.value()).toEqual({ fee: 90 });
    const broken = new SettingsStore(
      fakeDb({ value: { fee: -1 } }).db,
      outbox,
      's',
      'k',
      schema,
      () => ({ fee: 70 }),
    );
    expect(await broken.value()).toEqual({ fee: 70 });
  });

  it('validates, upserts and audits an update', async () => {
    const { db, executed } = fakeDb(null);
    const store = new SettingsStore(db, outbox, 's', 'k', schema, () => ({ fee: 70 }));
    await expect(store.update({ fee: -5 })).rejects.toThrow();
    await store.update({ fee: 120 });
    expect(executed.some((q) => q.includes('INSERT INTO settings'))).toBe(true);
    expect(outbox.add).toHaveBeenCalled();
  });
});
