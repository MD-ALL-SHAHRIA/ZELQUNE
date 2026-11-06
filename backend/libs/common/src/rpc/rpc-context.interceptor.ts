import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Actor, actorSchema, type RpcRequest } from '@zelqune/contracts';
import { randomUUID } from 'node:crypto';
import { Observable, throwError } from 'rxjs';
import { requestContext } from '../context/request-context';
import { INTERNAL_AUTH_FAILED, internalSecretMatches } from './internal-auth';

function metaOf(data: unknown): { requestId?: string; actor?: Actor } {
  const meta = (data as Partial<RpcRequest> | null | undefined)?.meta;
  const actor = actorSchema.safeParse(meta?.actor);
  return {
    requestId: typeof meta?.requestId === 'string' ? meta.requestId : undefined,
    actor: actor.success ? actor.data : undefined,
  };
}

/**
 * Service side of TCP calls: rejects callers without the shared internal secret (when one is
 * configured), then opens the request context from `meta.requestId`.
 */
@Injectable()
export class RpcContextInterceptor implements NestInterceptor {
  constructor(private readonly internalSecret?: string) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'rpc') return next.handle();
    const data: unknown = context.switchToRpc().getData();
    if (
      this.internalSecret &&
      !internalSecretMatches(
        this.internalSecret,
        (data as Partial<RpcRequest> | null | undefined)?.meta?.secret,
      )
    ) {
      return throwError(() => ({
        status: 401,
        code: INTERNAL_AUTH_FAILED,
        message: 'Unauthenticated internal call',
      }));
    }
    const { requestId, actor } = metaOf(data);
    return new Observable((subscriber) =>
      requestContext.run({ requestId: requestId ?? randomUUID(), actor }, () =>
        next.handle().subscribe(subscriber),
      ),
    );
  }
}
