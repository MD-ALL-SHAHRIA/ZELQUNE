import { type CallHandler, type ExecutionContext, HttpCode, Post } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EventEmitter } from 'node:events';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AppError } from '../errors/app-error';
import { Idempotent, IdempotencyInterceptor } from './idempotency.interceptor';
import { InMemoryIdempotencyStore } from './idempotency.store';

class Controller {
  @Post()
  @Idempotent()
  create(): void {}

  @Post()
  @HttpCode(202)
  @Idempotent({ scope: 'cart' })
  cartOnly(): void {}

  plain(): void {}
}

/** Minimal express-like response that emits `finish` like Node does after the reply. */
class FakeResponse extends EventEmitter {
  statusCode = 201;
  headers: Record<string, string> = {};
  status(code: number) {
    this.statusCode = code;
    return this;
  }
  setHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value;
  }
  getHeader(name: string) {
    return this.headers[name.toLowerCase()];
  }
}

function context(
  handler: keyof Controller,
  headers: Record<string, string>,
  body: unknown,
  user?: { id: string },
) {
  const res = new FakeResponse();
  const req = {
    method: 'POST',
    path: '/v1/checkout',
    originalUrl: '/v1/checkout',
    route: { path: '/v1/checkout' },
    body,
    user,
    header: (name: string) => headers[name.toLowerCase()],
  };
  const ctx = {
    getType: () => 'http',
    getHandler: () => Controller.prototype[handler],
    getClass: () => Controller,
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
  } as unknown as ExecutionContext;
  return { ctx, res };
}

const KEY = 'key-12345678';
const cart = (token: string) => ({ 'idempotency-key': KEY, 'x-cart-token': token });

describe('IdempotencyInterceptor', () => {
  let store: InMemoryIdempotencyStore;
  let interceptor: IdempotencyInterceptor;

  beforeEach(() => {
    store = new InMemoryIdempotencyStore();
    interceptor = new IdempotencyInterceptor(new Reflector(), store, {
      ttlSeconds: 60,
      lockTtlSeconds: 10,
    });
  });

  /** Runs a request to completion, then emits `finish` with the given final status. */
  const run = async (c: ReturnType<typeof context>, next: CallHandler, finalStatus?: number) => {
    const body = await lastValueFrom(await interceptor.intercept(c.ctx, next));
    if (finalStatus !== undefined) c.res.statusCode = finalStatus;
    c.res.emit('finish');
    await new Promise((r) => setImmediate(r));
    return body;
  };

  it('ignores routes without @Idempotent()', async () => {
    await expect(run(context('plain', {}, {}), { handle: () => of('ok') })).resolves.toBe('ok');
  });

  it('requires a well-formed key and a caller scope', async () => {
    const next = { handle: () => of('ok') };
    await expect(run(context('create', { 'x-cart-token': 't' }, {}), next)).rejects.toMatchObject({
      code: 'IDEMPOTENCY_KEY_REQUIRED',
    });
    await expect(
      run(context('create', { 'idempotency-key': 'short', 'x-cart-token': 't' }, {}), next),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_INVALID' });
    await expect(
      run(context('create', { 'idempotency-key': KEY }, {}), next),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_SCOPE_REQUIRED', status: 400 });
    // cart-only routes ignore the user
    await expect(
      run(context('cartOnly', { 'idempotency-key': KEY }, {}, { id: 'u1' }), next),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_SCOPE_REQUIRED' });
  });

  it('replays the original status code, body and Location header exactly', async () => {
    const handle = jest.fn(() => of({ orderCode: 'ZQ-ABC234' }));
    const first = context('create', cart('cart-a'), { qty: 1 });
    first.res.setHeader('Location', '/v1/orders/ZQ-ABC234');
    await run(first, { handle }, 201);

    const replay = context('create', cart('cart-a'), { qty: 1 });
    replay.res.statusCode = 200; // whatever Nest would set by default
    await expect(run(replay, { handle })).resolves.toEqual({ orderCode: 'ZQ-ABC234' });
    expect(handle).toHaveBeenCalledTimes(1);
    expect(replay.res.headers['idempotency-replayed']).toBe('true');
    expect(replay.res.headers.location).toBe('/v1/orders/ZQ-ABC234');
    expect(replay.res.statusCode).toBe(201);
    // Nest's later status() call cannot override the replayed status
    replay.res.status(200);
    expect(replay.res.statusCode).toBe(201);
  });

  it('stores the status of routes with a custom @HttpCode', async () => {
    const handle = jest.fn(() => of({ accepted: true }));
    await run(context('cartOnly', cart('cart-a'), {}), { handle }, 202);
    const replay = context('cartOnly', cart('cart-a'), {});
    await run(replay, { handle });
    expect(replay.res.statusCode).toBe(202);
  });

  it('scopes keys to the caller: same key from another cart or user is independent', async () => {
    const handle = jest.fn(() => of('ok'));
    await run(context('create', cart('cart-a'), { qty: 1 }), { handle }, 201);
    await run(context('create', cart('cart-b'), { qty: 1 }), { handle }, 201);
    await run(
      context('create', { 'idempotency-key': KEY }, { qty: 1 }, { id: 'user-1' }),
      { handle },
      201,
    );
    expect(handle).toHaveBeenCalledTimes(3);
    // a different body from cart-b is not "reuse" of cart-a's key
    await expect(
      run(context('create', cart('cart-b'), { qty: 2 }), { handle }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED', status: 422 });
  });

  it('rejects a concurrent duplicate while the first is in flight (409)', async () => {
    const first = await interceptor.intercept(context('create', cart('cart-a'), {}).ctx, {
      handle: () => of('first'),
    });
    await expect(
      run(context('create', cart('cart-a'), {}), { handle: () => of('x') }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_IN_PROGRESS', status: 409 });
    await lastValueFrom(first);
  });

  it('releases the key when the handler throws or the response ends with an error status', async () => {
    await expect(
      run(context('create', cart('cart-a'), {}), {
        handle: () => throwError(() => new AppError('OUT_OF_STOCK', 'x', 409)),
      }),
    ).rejects.toMatchObject({ code: 'OUT_OF_STOCK' });
    await expect(
      run(context('create', cart('cart-a'), {}), { handle: () => of('retried') }, 500),
    ).resolves.toBe('retried');
    // the 500 was not stored: next attempt runs the handler again
    const handle = jest.fn(() => of('third'));
    await run(context('create', cart('cart-a'), {}), { handle }, 201);
    expect(handle).toHaveBeenCalledTimes(1);
  });
});
