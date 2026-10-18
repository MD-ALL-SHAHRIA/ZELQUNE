import { type ClientProxy } from '@nestjs/microservices';
import { isRpcErrorPayload, type RpcRequest, type ServiceName } from '@zelqune/contracts';
import { randomUUID } from 'node:crypto';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { requestContext } from '../context/request-context';
import { AppError } from '../errors/app-error';

export interface SendOptions {
  timeoutMs?: number;
}

/** Gateway side of TCP calls: wraps data with request metadata and maps failures to AppError. */
export class ServiceClient {
  constructor(
    readonly name: ServiceName,
    private readonly proxy: ClientProxy,
    private readonly defaultTimeoutMs = 5000,
  ) {}

  async send<TResult, TData = unknown>(
    pattern: string,
    data: TData,
    options: SendOptions = {},
  ): Promise<TResult> {
    const request: RpcRequest<TData> = {
      meta: { requestId: requestContext.requestId() ?? randomUUID() },
      data,
    };
    try {
      return await firstValueFrom(
        this.proxy
          .send<TResult, RpcRequest<TData>>(pattern, request)
          .pipe(timeout(options.timeoutMs ?? this.defaultTimeoutMs)),
      );
    } catch (err) {
      if (err instanceof TimeoutError) {
        throw new AppError('UPSTREAM_TIMEOUT', `${this.name} did not respond in time`, 504);
      }
      if (isRpcErrorPayload(err)) {
        throw new AppError(err.code, err.message, err.status, err.details);
      }
      throw new AppError('UPSTREAM_UNAVAILABLE', `${this.name} is unavailable`, 503);
    }
  }

  close(): Promise<void> {
    return Promise.resolve(this.proxy.close());
  }
}
