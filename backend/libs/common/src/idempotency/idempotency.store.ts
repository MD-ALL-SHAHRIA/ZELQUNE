export interface IdempotencyRecord {
  state: 'processing' | 'completed';
  fingerprint: string;
  body?: unknown;
}

export interface IdempotencyStore {
  /** Atomically claims `key`. Returns null if claimed, otherwise the existing record. */
  acquire(
    key: string,
    fingerprint: string,
    lockTtlSeconds: number,
  ): Promise<IdempotencyRecord | null>;
  complete(key: string, record: IdempotencyRecord, ttlSeconds: number): Promise<void>;
  release(key: string): Promise<void>;
}

export const IDEMPOTENCY_STORE = Symbol('IDEMPOTENCY_STORE');

/** Process-local store for tests and single-instance dev. */
export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly records = new Map<string, { record: IdempotencyRecord; expiresAt: number }>();

  acquire(
    key: string,
    fingerprint: string,
    lockTtlSeconds: number,
  ): Promise<IdempotencyRecord | null> {
    const existing = this.records.get(key);
    if (existing && existing.expiresAt > Date.now()) return Promise.resolve(existing.record);
    this.set(key, { state: 'processing', fingerprint }, lockTtlSeconds);
    return Promise.resolve(null);
  }

  complete(key: string, record: IdempotencyRecord, ttlSeconds: number): Promise<void> {
    this.set(key, record, ttlSeconds);
    return Promise.resolve();
  }

  release(key: string): Promise<void> {
    this.records.delete(key);
    return Promise.resolve();
  }

  private set(key: string, record: IdempotencyRecord, ttlSeconds: number): void {
    this.records.set(key, { record, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}
