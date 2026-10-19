import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { AppError, CART_TOKEN_HEADER } from '@zelqune/common';
import { type Request } from 'express';

/** The guest cart bearer token from X-Cart-Token (400 if missing or malformed). */
export const CartToken = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const token = ctx.switchToHttp().getRequest<Request>().header(CART_TOKEN_HEADER);
  if (!token || !/^[A-Za-z0-9_-]{20,100}$/.test(token)) {
    throw new AppError('CART_TOKEN_REQUIRED', 'X-Cart-Token header is required', 400);
  }
  return token;
});
