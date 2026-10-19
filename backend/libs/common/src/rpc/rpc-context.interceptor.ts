import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Actor, actorSchema, type RpcRequest } from '@zelqune/contracts';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { requestContext } from '../context/request-context';

function metaOf(data: unknown): { requestId?: string; actor?: Actor } {
  const meta = (data as Partial<RpcRequest> | null | undefined)?.meta;
  const actor = actorSchema.safeParse(meta?.actor);
  return {
    requestId: typeof meta?.requestId === 'string' ? meta.requestId : undefined,
    actor: actor.success ? actor.data : undefined,
  };
}

/** Service side of TCP calls: opens the request context from `meta.requestId`. */
@Injectable()
export class RpcContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'rpc') return next.handle();
    const { requestId, actor } = metaOf(context.switchToRpc().getData());
    return new Observable((subscriber) =>
      requestContext.run({ requestId: requestId ?? randomUUID(), actor }, () =>
        next.handle().subscribe(subscriber),
      ),
    );
  }
}
