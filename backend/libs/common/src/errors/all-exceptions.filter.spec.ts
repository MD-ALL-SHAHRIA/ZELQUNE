import { type ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import { lastValueFrom, type Observable } from 'rxjs';
import { z } from 'zod';
import { requestContext } from '../context/request-context';
import { AllExceptionsFilter, toErrorPayload } from './all-exceptions.filter';
import { AppError } from './app-error';

function httpHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    getType: () => 'http',
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('toErrorPayload', () => {
  it('maps AppError, HttpException, ZodError and unknown errors', () => {
    expect(toErrorPayload(new AppError('OUT_OF_STOCK', 'No stock', 409))).toEqual({
      status: 409,
      code: 'OUT_OF_STOCK',
      message: 'No stock',
      details: undefined,
    });
    expect(toErrorPayload(new NotFoundException('Nope'))).toEqual({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Nope',
    });
    expect(toErrorPayload(new BadRequestException(['a must be a string']))).toMatchObject({
      status: 400,
      message: 'Validation failed',
      details: ['a must be a string'],
    });
    const zodError = z.object({ a: z.string() }).safeParse({}).error;
    expect(toErrorPayload(zodError)).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    expect(toErrorPayload(new Error('db password is hunter2'))).toEqual({
      status: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });
  });
});

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();

  it('writes the standard HTTP error body with the request id', () => {
    const { host, status, json } = httpHost();
    requestContext.run({ requestId: 'req-9' }, () =>
      filter.catch(new AppError('BAD_THING', 'Bad thing', 422), host),
    );
    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'BAD_THING', message: 'Bad thing', requestId: 'req-9' },
    });
  });

  it('returns an RpcErrorPayload observable in rpc context', async () => {
    const host = { getType: () => 'rpc' } as unknown as ArgumentsHost;
    const result = filter.catch(new AppError('X', 'x', 409), host) as Observable<never>;
    await expect(lastValueFrom(result)).rejects.toEqual({
      status: 409,
      code: 'X',
      message: 'x',
      details: undefined,
    });
  });
});

describe('toErrorPayload with nestjs-zod', () => {
  it('maps request validation errors to 400 VALIDATION_FAILED with issues', () => {
    const zodError = z.object({ a: z.string() }).safeParse({}).error;
    const payload = toErrorPayload(new ZodValidationException(zodError));
    expect(payload).toMatchObject({ status: 400, code: 'VALIDATION_FAILED' });
    expect(Array.isArray(payload.details)).toBe(true);
  });
});
