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
import { catchError, from, mergeMap, type Observable, of, tap, throwError } from 'rxjs';
import { AppError } from '../errors/app-error';
import {
  IDEMPOTENCY_STORE,
  type IdempotencyRecord,
  type IdempotencyStore,
} from './idempotency.store';

export const IDEMPOTENCY_HEADER = 'idempotency-key';
export const IDEMPOTENCY_REPLAYED_HEADER = 'idempotency-replayed';
/** Guest cart bearer token; also an idempotency scope for anonymous checkout. */
export const CART_TOKEN_HEADER = 'x-cart-token';
const IDEMPOTENT_METADATA = 'zelqune:idempotent';
const KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const REPLAYED_RESPONSE_HEADERS = ['location'];

/**
 * Who an Idempotency-Key belongs to. Keys are only unique per caller, so two callers can
 * never collide or receive each other's responses.
 * - `user`: the authenticated user (req.user.id)
 * - `cart`: the guest cart (hash of X-Cart-Token)
 * - `user-or-cart` (default): user if authenticated, otherwise the cart
 */
export type IdempotencyScope = 'user' | 'cart' | 'user-or-cart';

export interface IdempotentOptions {
  /** Reject requests without the header (default true). */
  required?: boolean;
  scope?: IdempotencyScope;
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

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

export function resolveIdempotencyScope(req: Request, scope: IdempotencyScope): string | null {
  const userId = (req as Request & { user?: { id?: string } }).user?.id;
  const cartToken = req.header(CART_TOKEN_HEADER);
  if ((scope === 'user' || scope === 'user-or-cart') && userId) return `u:${userId}`;
  if ((scope === 'cart' || scope === 'user-or-cart') && cartToken)
    return `c:${sha256(cartToken).slice(0, 32)}`;
  return null;
}

/**
 * Nest applies the route's own status code when it writes a handler result, so a replay of a
 * response with a different status overrides `status()` for this one response.
 */
function forceStatus(res: Response, statusCode: number): void {
  res.status(statusCode);
  res.status = function keepReplayedStatus(this: Response) {
    return this;
  } as Response['status'];
}

/**
 * Same caller + key + request -> replays the original status, body and Location header
 * (`Idempotency-Replayed: true`). Same key with a different request -> 422. Same key while the
 * first request is in flight -> 409. Failed requests (status >= 400) release the key.
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
    const scope = resolveIdempotencyScope(req, routeOptions.scope ?? 'user-or-cart');
    if (!scope) {
      throw new AppError(
        'IDEMPOTENCY_SCOPE_REQUIRED',
        'Idempotency-Key needs an authenticated user or a cart token',
        400,
      );
    }

    const routePath = (req.route as { path?: string } | undefined)?.path ?? req.path;
    const storeKey = `idem:${scope}:${req.method}:${routePath}:${key}`;
    const fingerprint = sha256(
      JSON.stringify({ method: req.method, url: req.originalUrl, body: req.body as unknown }),
    );

    const existing = await this.store.acquire(storeKey, fingerprint, this.options.lockTtlSeconds);
    if (existing) return of(this.replay(existing, fingerprint, res));

    let failed = false;
    let settled = false;
    const settle = (body: unknown): void => {
      if (settled) return;
      settled = true;
      const ok = !failed && res.statusCode < 400;
      const write = ok
        ? this.store.complete(
            storeKey,
            {
              state: 'completed',
              fingerprint,
              statusCode: res.statusCode,
              body,
              headers: pickHeaders(res),
            },
            this.options.ttlSeconds,
          )
        : this.store.release(storeKey);
      write.catch(() => undefined); // best effort; the lock expires on its own
    };

    return next.handle().pipe(
      tap((body: unknown) => {
        // Store once the real status code is known (after Nest/filters wrote the response).
        res.once('finish', () => settle(body));
        res.once('close', () => settle(body));
      }),
      catchError((err: unknown) => {
        failed = true;
        settled = true;
        return from(this.store.release(storeKey)).pipe(mergeMap(() => throwError(() => err)));
      }),
    );
  }

  private replay(existing: IdempotencyRecord, fingerprint: string, res: Response): unknown {
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
    for (const [name, value] of Object.entries(existing.headers ?? {})) res.setHeader(name, value);
    if (existing.statusCode) forceStatus(res, existing.statusCode);
    return existing.body;
  }
}

function pickHeaders(res: Response): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const name of REPLAYED_RESPONSE_HEADERS) {
    const value = res.getHeader(name);
    if (typeof value === 'string') picked[name] = value;
  }
  return picked;
}
