import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { type ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, NEVER, Observable, of, throwError } from 'rxjs';
import { requestContext } from '../context/request-context';
import { RpcContextInterceptor } from './rpc-context.interceptor';
import { ServiceClient } from './service-client';

describe('ServiceClient', () => {
  const proxy = (result: Observable<unknown>) =>
    ({ send: jest.fn(() => result), close: jest.fn() }) as unknown as ClientProxy & {
      send: jest.Mock;
    };

  it('wraps data with the current request id', async () => {
    const p = proxy(of('pong'));
    const client = new ServiceClient('catalog-service', p);
    await requestContext.run({ requestId: 'req-7' }, () => client.send('health.ping', { a: 1 }));
    expect(p.send).toHaveBeenCalledWith('health.ping', {
      meta: { requestId: 'req-7' },
      data: { a: 1 },
    });
  });

  it('maps service errors, timeouts and connection failures to AppError', async () => {
    const rpcError = { status: 409, code: 'CONFLICT_X', message: 'conflict' };
    await expect(
      new ServiceClient('catalog-service', proxy(throwError(() => rpcError))).send('p', {}),
    ).rejects.toMatchObject({ code: 'CONFLICT_X', status: 409 });
    await expect(
      new ServiceClient('catalog-service', proxy(NEVER)).send('p', {}, { timeoutMs: 10 }),
    ).rejects.toMatchObject({ code: 'UPSTREAM_TIMEOUT', status: 504 });
    await expect(
      new ServiceClient('catalog-service', proxy(throwError(() => new Error('ECONNREFUSED')))).send(
        'p',
        {},
      ),
    ).rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE', status: 503 });
  });
});

describe('RpcContextInterceptor', () => {
  it('runs the handler inside the request context from meta.requestId', async () => {
    const ctx = {
      getType: () => 'rpc',
      switchToRpc: () => ({ getData: () => ({ meta: { requestId: 'req-rpc' }, data: {} }) }),
    } as unknown as ExecutionContext;
    const next: CallHandler = {
      handle: () => new Observable((s) => s.next(requestContext.requestId())),
    };
    const result = new RpcContextInterceptor().intercept(ctx, next);
    await expect(new Promise((resolve) => result.subscribe(resolve))).resolves.toBe('req-rpc');
    await expect(lastValueFrom(of(requestContext.requestId()))).resolves.toBeUndefined();
  });
});

describe('actor propagation', () => {
  it('ServiceClient forwards the request actor; RpcContextInterceptor restores it', async () => {
    const send = jest.fn(() => of('ok'));
    const client = new ServiceClient('order-service', {
      send,
      close: jest.fn(),
    } as unknown as ClientProxy);
    await requestContext.run({ requestId: 'r1', actor: { id: 'admin-1', role: 'OWNER' } }, () =>
      client.send('x', {}),
    );
    expect(send).toHaveBeenCalledWith('x', {
      meta: { requestId: 'r1', actor: { id: 'admin-1', role: 'OWNER' } },
      data: {},
    });

    const ctx = {
      getType: () => 'rpc',
      switchToRpc: () => ({
        getData: () => ({
          meta: { requestId: 'r2', actor: { id: 'admin-1', role: 'STAFF' } },
          data: {},
        }),
      }),
    } as unknown as ExecutionContext;
    const seen = await new Promise((resolve) =>
      new RpcContextInterceptor()
        .intercept(ctx, { handle: () => new Observable((s) => s.next(requestContext.actor())) })
        .subscribe(resolve),
    );
    expect(seen).toEqual({ id: 'admin-1', role: 'STAFF' });
  });

  it('ignores malformed actors', async () => {
    const ctx = {
      getType: () => 'rpc',
      switchToRpc: () => ({
        getData: () => ({ meta: { requestId: 'r3', actor: { id: 'x', role: 'GOD' } }, data: {} }),
      }),
    } as unknown as ExecutionContext;
    const seen = await new Promise((resolve) =>
      new RpcContextInterceptor()
        .intercept(ctx, {
          handle: () => new Observable((s) => s.next(requestContext.actor() ?? 'none')),
        })
        .subscribe(resolve),
    );
    expect(seen).toBe('none');
  });
});
