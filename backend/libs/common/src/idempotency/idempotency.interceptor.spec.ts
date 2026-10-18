import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AppError } from '../errors/app-error';
import { Idempotent, IdempotencyInterceptor } from './idempotency.interceptor';
import { InMemoryIdempotencyStore } from './idempotency.store';

class Controller {
  @Idempotent()
  create(): void {}

  plain(): void {}
}

function context(handler: keyof Controller, headers: Record<string, string>, body: unknown) {
  const setHeader = jest.fn();
  const req = {
    method: 'POST',
    path: '/v1/orders',
    originalUrl: '/v1/orders',
    route: { path: '/v1/orders' },
    body,
    header: (name: string) => headers[name.toLowerCase()],
  };
  const ctx = {
    getType: () => 'http',
    getHandler: () => Controller.prototype[handler],
    getClass: () => Controller,
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({ setHeader }) }),
  } as unknown as ExecutionContext;
  return { ctx, setHeader };
}

const KEY = { 'idempotency-key': 'key-12345678' };

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

  const run = async (ctx: ExecutionContext, next: CallHandler) =>
    lastValueFrom(await interceptor.intercept(ctx, next));

  it('ignores routes without @Idempotent()', async () => {
    const handle = jest.fn(() => of('ok'));
    await expect(run(context('plain', {}, {}).ctx, { handle })).resolves.toBe('ok');
  });

  it('requires a well-formed key', async () => {
    const next = { handle: () => of('ok') };
    await expect(run(context('create', {}, {}).ctx, next)).rejects.toMatchObject({
      code: 'IDEMPOTENCY_KEY_REQUIRED',
      status: 400,
    });
    await expect(
      run(context('create', { 'idempotency-key': 'short' }, {}).ctx, next),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_INVALID' });
  });

  it('runs the handler once and replays the stored body for the same request', async () => {
    const handle = jest.fn(() => of({ orderId: 'o1' }));
    await expect(run(context('create', KEY, { qty: 1 }).ctx, { handle })).resolves.toEqual({
      orderId: 'o1',
    });

    const replay = context('create', KEY, { qty: 1 });
    await expect(run(replay.ctx, { handle })).resolves.toEqual({ orderId: 'o1' });
    expect(handle).toHaveBeenCalledTimes(1);
    expect(replay.setHeader).toHaveBeenCalledWith('idempotency-replayed', 'true');
  });

  it('rejects the same key with a different body (422)', async () => {
    await run(context('create', KEY, { qty: 1 }).ctx, { handle: () => of('ok') });
    await expect(
      run(context('create', KEY, { qty: 2 }).ctx, { handle: () => of('ok') }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_KEY_REUSED', status: 422 });
  });

  it('rejects a concurrent duplicate while the first is in flight (409)', async () => {
    // intercept() claims the key; the returned observable is not subscribed yet, so it stays in flight.
    const first = await interceptor.intercept(context('create', KEY, { qty: 1 }).ctx, {
      handle: () => of('first'),
    });
    await expect(
      run(context('create', KEY, { qty: 1 }).ctx, { handle: () => of('second') }),
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_IN_PROGRESS', status: 409 });
    await lastValueFrom(first);
  });

  it('releases the key when the handler fails so the client can retry', async () => {
    await expect(
      run(context('create', KEY, { qty: 1 }).ctx, {
        handle: () => throwError(() => new AppError('BOOM', 'boom', 500)),
      }),
    ).rejects.toMatchObject({ code: 'BOOM' });
    await expect(
      run(context('create', KEY, { qty: 1 }).ctx, { handle: () => of('retried') }),
    ).resolves.toBe('retried');
  });
});
