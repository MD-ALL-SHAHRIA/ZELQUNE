import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { type Redis } from 'ioredis';
import { firstValueFrom, of } from 'rxjs';
import { PublicCacheInterceptor } from './public-cache.interceptor';

const CFG = { PUBLIC_CACHE_SECONDS: 30 };

function ctx(method = 'GET', url = '/v1/catalog/products?p=a') {
  const headers: Record<string, string> = {};
  const context = {
    switchToHttp: () => ({
      getRequest: () => ({ method, originalUrl: url }),
      getResponse: () => ({ setHeader: (k: string, v: string) => (headers[k] = v) }),
    }),
  } as unknown as ExecutionContext;
  return { context, headers };
}

function redis(store: Map<string, string>, down = false) {
  return {
    get: jest.fn((k: string) =>
      down ? Promise.reject(new Error('down')) : Promise.resolve(store.get(k) ?? null),
    ),
    set: jest.fn((k: string, v: string) => {
      if (down) return Promise.reject(new Error('down'));
      store.set(k, v);
      return Promise.resolve('OK');
    }),
  } as unknown as Redis & { get: jest.Mock; set: jest.Mock };
}

const handler = (body: unknown) =>
  ({ handle: jest.fn(() => of(body)) }) as CallHandler & {
    handle: jest.Mock;
  };

describe('PublicCacheInterceptor', () => {
  it('misses once, then serves the same URL from Redis', async () => {
    const store = new Map<string, string>();
    const r = redis(store);
    const interceptor = new PublicCacheInterceptor(r, CFG);
    const first = handler({ items: [1] });
    const a = ctx();
    expect(await firstValueFrom(interceptor.intercept(a.context, first))).toEqual({ items: [1] });
    expect(a.headers['X-Cache']).toBe('MISS');
    expect(a.headers['Cache-Control']).toContain('public, max-age=30');
    await new Promise((done) => setImmediate(done));
    expect(r.set).toHaveBeenCalledWith(
      'cache:public:/v1/catalog/products?p=a',
      '{"items":[1]}',
      'EX',
      30,
    );

    const second = handler({ items: [2] });
    const b = ctx();
    expect(await firstValueFrom(interceptor.intercept(b.context, second))).toEqual({ items: [1] });
    expect(b.headers['X-Cache']).toBe('HIT');
    expect(second.handle).not.toHaveBeenCalled();
  });

  it('keeps price buckets apart', async () => {
    const store = new Map([['cache:public:/v1/catalog/products?p=a', '{"bucket":"a"}']]);
    const interceptor = new PublicCacheInterceptor(redis(store), CFG);
    const h = handler({ bucket: 'b' });
    const { context } = ctx('GET', '/v1/catalog/products?p=b');
    expect(await firstValueFrom(interceptor.intercept(context, h))).toEqual({ bucket: 'b' });
  });

  it('still answers when Redis is down', async () => {
    const interceptor = new PublicCacheInterceptor(redis(new Map(), true), CFG);
    const h = handler({ ok: true });
    expect(await firstValueFrom(interceptor.intercept(ctx().context, h))).toEqual({ ok: true });
  });

  it('never caches anything but GET', async () => {
    const r = redis(new Map());
    const h = handler({ ok: true });
    await firstValueFrom(new PublicCacheInterceptor(r, CFG).intercept(ctx('POST').context, h));
    expect(r.get).not.toHaveBeenCalled();
  });

  it('is off when PUBLIC_CACHE_SECONDS is 0', async () => {
    const r = redis(new Map());
    const h = handler({ ok: true });
    const a = ctx();
    await firstValueFrom(
      new PublicCacheInterceptor(r, { PUBLIC_CACHE_SECONDS: 0 }).intercept(a.context, h),
    );
    expect(r.get).not.toHaveBeenCalled();
    expect(a.headers['Cache-Control']).toBeUndefined();
  });
});
