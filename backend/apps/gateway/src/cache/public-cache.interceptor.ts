import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Request, type Response } from 'express';
import { type Redis } from 'ioredis';
import { from, type Observable, of, switchMap, tap } from 'rxjs';
import { APP_CONFIG } from '@zelqune/common';
import { type GatewayEnv } from '../config/gateway-env';
import { REDIS } from '../redis/redis.module';

/**
 * Short shared cache for public, read-only storefront data (catalog, sale, home content): the
 * first request in a window goes to the service, the rest are served from Redis. Keyed by the
 * full URL, so the price bucket `?p=a|b` and pagination stay separate. Checkout never reads
 * these routes (it takes a fresh catalog snapshot over RPC), so a cached price cannot be charged.
 * Redis being down only means no caching. `Cache-Control` lets a CDN keep the same window.
 * PUBLIC_CACHE_SECONDS (default 30; the storefront's ISR is 60 s) sets it; 0 turns it off.
 */
@Injectable()
export class PublicCacheInterceptor implements NestInterceptor {
  private readonly seconds: number;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(APP_CONFIG) config: Pick<GatewayEnv, 'PUBLIC_CACHE_SECONDS'>,
  ) {
    this.seconds = config.PUBLIC_CACHE_SECONDS;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    if (req.method !== 'GET' || this.seconds === 0) return next.handle();
    const key = `cache:public:${req.originalUrl}`;
    res.setHeader(
      'Cache-Control',
      `public, max-age=${this.seconds}, stale-while-revalidate=${this.seconds * 2}`,
    );
    return from(this.redis.get(key).catch(() => null)).pipe(
      switchMap((hit) => {
        if (hit !== null) {
          res.setHeader('X-Cache', 'HIT');
          return of(JSON.parse(hit) as unknown);
        }
        res.setHeader('X-Cache', 'MISS');
        return next.handle().pipe(
          tap((body) => {
            void this.redis
              .set(key, JSON.stringify(body), 'EX', this.seconds)
              .catch(() => undefined);
          }),
        );
      }),
    );
  }
}
