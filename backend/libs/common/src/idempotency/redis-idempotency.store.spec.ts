import { type Redis } from 'ioredis';
import { RedisIdempotencyStore } from './redis-idempotency.store';

describe('RedisIdempotencyStore', () => {
  const redis = { set: jest.fn(), get: jest.fn(), del: jest.fn() };
  const store = new RedisIdempotencyStore(redis as unknown as Redis);

  beforeEach(() => jest.resetAllMocks());

  it('claims with SET NX EX', async () => {
    redis.set.mockResolvedValue('OK');
    await expect(store.acquire('k', 'fp', 30)).resolves.toBeNull();
    expect(redis.set).toHaveBeenCalledWith(
      'k',
      JSON.stringify({ state: 'processing', fingerprint: 'fp' }),
      'EX',
      30,
      'NX',
    );
  });

  it('returns the existing record when already claimed', async () => {
    redis.set.mockResolvedValue(null);
    redis.get.mockResolvedValue(JSON.stringify({ state: 'completed', fingerprint: 'fp', body: 1 }));
    await expect(store.acquire('k', 'fp', 30)).resolves.toEqual({
      state: 'completed',
      fingerprint: 'fp',
      body: 1,
    });
  });
});
