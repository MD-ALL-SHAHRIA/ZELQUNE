import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Request, type Response } from 'express';
import { createHash } from 'node:crypto';
import { catchError, from, mergeMap, type Observable, of, throwError } from 'rxjs';
import { AppError } from '../errors/app-error';
import { IDEMPOTENCY_STORE, type IdempotencyStore } from './idempotency.store';

export const IDEMPOTENCY_HEADER = 'idempotency-key';
export const IDEMPOTENCY_REPLAYED_HEADER = 'idempotency-replayed';
const IDEMPOTENT_METADATA = 'zelqune:idempotent';
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

export interface IdempotentOptions {
  /** Reject requests without the header (default true). */
  required?: boolean;
}

export interface IdempotencyOptions {
  /** How long a completed response is replayed. */
  ttlSeconds: number;
  /** How long an in-flight claim blocks duplicates before it can be retried. */
  lockTtlSeconds: number;
}

export const IDEMPOTENCY_OPTIONS = Symbol('IDEMPOTENCY_OPTIONS');

/** Marks a route as requiring an `Idempotency-Key` header (order/payment creation). */
export const Idempotent = (options: IdempotentOptions = {}): MethodDecorator & ClassDecorator =>
  SetMetadata(IDEMPOTENT_METADATA, options);

/**
 * Same key + same request -> replays the stored response body (header `Idempotency-Replayed: true`).
 * Same key + different request -> 422. Same key while the first is still running -> 409.
 * Failed requests release the key so the client can retry.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    @Inject(IDEMPOTENCY_STORE) private readonly store: IdempotencyStore,
    @Inject(IDEMPOTENCY_OPTIONS) private readonly options: IdempotencyOptions,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const routeOptions = this.reflector.getAllAndOverride<IdempotentOptions | undefined>(
      IDEMPOTENT_METADATA,
      [context.getHandler(), context.getClass()],
    );
    if (!routeOptions || context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const key = req.header(IDEMPOTENCY_HEADER);

    if (!key) {
      if (routeOptions.required === false) return next.handle();
      throw new AppError('IDEMPOTENCY_KEY_REQUIRED', 'Idempotency-Key header is required', 400);
    }
    if (!KEY_PATTERN.test(key)) {
      throw new AppError(
        'IDEMPOTENCY_KEY_INVALID',
        'Idempotency-Key must be 8-128 characters of [A-Za-z0-9_-]',
        400,
      );
    }

    const routePath = (req.route as { path?: string } | undefined)?.path ?? req.path;
    const storeKey = `idem:${req.method}:${routePath}:${key}`;
    const fingerprint = createHash('sha256')
      .update(JSON.stringify({ method: req.method, url: req.originalUrl, body: req.body as unknown }))
      .digest('hex');

    const existing = await this.store.acquire(storeKey, fingerprint, this.options.lockTtlSeconds);
    if (existing) {
      if (existing.fingerprint !== fingerprint) {
        throw new AppError(
          'IDEMPOTENCY_KEY_REUSED',
          'Idempotency-Key was already used with a different request',
          422,
        );
      }
      if (existing.state === 'processing') {
        throw new AppError(
          'IDEMPOTENCY_IN_PROGRESS',
          'A request with this Idempotency-Key is still being processed',
          409,
        );
      }
      res.setHeader(IDEMPOTENCY_REPLAYED_HEADER, 'true');
      return of(existing.body);
    }

    return next.handle().pipe(
      mergeMap(async (body: unknown) => {
        await this.store.complete(
          storeKey,
          { state: 'completed', fingerprint, body },
          this.options.ttlSeconds,
        );
        return body;
      }),
      catchError((err: unknown) =>
        from(this.store.release(storeKey)).pipe(mergeMap(() => throwError(() => err))),
      ),
    );
  }
}
