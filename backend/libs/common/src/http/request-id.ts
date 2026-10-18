import { randomUUID } from 'node:crypto';
import { type IncomingMessage, type ServerResponse } from 'node:http';
import { requestContext } from '../context/request-context';

export const REQUEST_ID_HEADER = 'x-request-id';
const VALID_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

/** Reuses a well-formed incoming id, otherwise generates one. */
export function resolveRequestId(incoming: unknown): string {
  return typeof incoming === 'string' && VALID_REQUEST_ID.test(incoming) ? incoming : randomUUID();
}

/**
 * Express-level middleware (register with `app.use` so it runs before everything else):
 * normalises x-request-id, echoes it on the response and opens the request context.
 */
export function requestIdMiddleware(
  req: IncomingMessage,
  res: ServerResponse,
  next: (err?: unknown) => void,
): void {
  const requestId = resolveRequestId(req.headers[REQUEST_ID_HEADER]);
  req.headers[REQUEST_ID_HEADER] = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  requestContext.run({ requestId }, () => next());
}
