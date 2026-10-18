import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { isRpcErrorPayload, type RpcErrorPayload } from '@zelqune/contracts';
import { type Response } from 'express';
import { throwError, type Observable } from 'rxjs';
import { ZodError } from 'zod';
import { requestContext } from '../context/request-context';
import { AppError } from './app-error';

export interface ErrorResponseBody {
  error: { code: string; message: string; details?: unknown; requestId?: string };
}

function codeForStatus(status: number): string {
  const name = (HttpStatus as unknown as Record<number, string | undefined>)[status];
  return name ?? 'ERROR';
}

/** Normalises anything thrown into a status + stable code + safe message. */
export function toErrorPayload(exception: unknown): RpcErrorPayload {
  if (exception instanceof AppError) {
    return {
      status: exception.status,
      code: exception.code,
      message: exception.message,
      details: exception.details,
    };
  }
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const response = exception.getResponse();
    if (typeof response === 'string') {
      return { status, code: codeForStatus(status), message: response };
    }
    const { message } = response as { message?: unknown };
    if (Array.isArray(message)) {
      return { status, code: codeForStatus(status), message: 'Validation failed', details: message };
    }
    return {
      status,
      code: codeForStatus(status),
      message: typeof message === 'string' ? message : exception.message,
    };
  }
  if (exception instanceof ZodError) {
    return {
      status: HttpStatus.BAD_REQUEST,
      code: 'VALIDATION_FAILED',
      message: 'Validation failed',
      details: exception.issues,
    };
  }
  if (isRpcErrorPayload(exception)) {
    return exception;
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
  };
}

/**
 * Global filter for both HTTP and TCP (rpc) contexts. HTTP gets
 * `{ error: { code, message, details?, requestId } }`; rpc gets an RpcErrorPayload the gateway maps back to HTTP.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): Observable<never> | void {
    const payload = toErrorPayload(exception);
    if (payload.status >= 500) {
      this.logger.error(
        { err: exception, code: payload.code },
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    if (host.getType() === 'rpc') {
      return throwError(() => payload);
    }

    const response = host.switchToHttp().getResponse<Response>();
    const body: ErrorResponseBody = {
      error: {
        code: payload.code,
        message: payload.message,
        ...(payload.details === undefined ? {} : { details: payload.details }),
        requestId: requestContext.requestId(),
      },
    };
    response.status(payload.status).json(body);
  }
}
