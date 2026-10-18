import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type RpcRequest } from '@zelqune/contracts';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { requestContext } from '../context/request-context';

function requestIdOf(data: unknown): string | undefined {
  const meta = (data as Partial<RpcRequest> | null | undefined)?.meta;
  return typeof meta?.requestId === 'string' ? meta.requestId : undefined;
}

/** Service side of TCP calls: opens the request context from `meta.requestId`. */
@Injectable()
export class RpcContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'rpc') return next.handle();
    const requestId = requestIdOf(context.switchToRpc().getData()) ?? randomUUID();
    return new Observable((subscriber) =>
      requestContext.run({ requestId }, () => next.handle().subscribe(subscriber)),
    );
  }
}
