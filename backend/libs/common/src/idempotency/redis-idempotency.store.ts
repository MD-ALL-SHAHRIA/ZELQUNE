import { type Redis } from 'ioredis';
import { type IdempotencyRecord, type IdempotencyStore } from './idempotency.store';

export class RedisIdempotencyStore implements IdempotencyStore {
  constructor(private readonly redis: Redis) {}

  async acquire(
    key: string,
    fingerprint: string,
    lockTtlSeconds: number,
  ): Promise<IdempotencyRecord | null> {
    const processing: IdempotencyRecord = { state: 'processing', fingerprint };
    // Retry once in case the existing key expires between SET NX and GET.
    for (let attempt = 0; attempt < 2; attempt++) {
      const claimed = await this.redis.set(
        key,
        JSON.stringify(processing),
        'EX',
        lockTtlSeconds,
        'NX',
      );
      if (claimed === 'OK') return null;
      const raw = await this.redis.get(key);
      if (raw !== null) return JSON.parse(raw) as IdempotencyRecord;
    }
    throw new Error(`Could not acquire idempotency key ${key}`);
  }

  async complete(key: string, record: IdempotencyRecord, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(record), 'EX', ttlSeconds);
  }

  async release(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
