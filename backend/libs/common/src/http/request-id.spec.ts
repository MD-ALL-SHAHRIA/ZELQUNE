import { type IncomingMessage, type ServerResponse } from 'node:http';
import { requestContext } from '../context/request-context';
import { requestIdMiddleware, resolveRequestId } from './request-id';

describe('request id', () => {
  it('keeps well-formed ids and replaces malformed ones', () => {
    expect(resolveRequestId('abc-123')).toBe('abc-123');
    expect(resolveRequestId('has space')).toMatch(/^[0-9a-f-]{36}$/);
    expect(resolveRequestId('x'.repeat(129))).toMatch(/^[0-9a-f-]{36}$/);
    expect(resolveRequestId(undefined)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('sets the header on req/res and exposes it via the request context', () => {
    const req = { headers: { 'x-request-id': 'req-1' } } as unknown as IncomingMessage;
    const setHeader = jest.fn();
    const res = { setHeader } as unknown as ServerResponse;
    let seen: string | undefined;

    requestIdMiddleware(req, res, () => {
      seen = requestContext.requestId();
    });

    expect(seen).toBe('req-1');
    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'req-1');
    expect(requestContext.requestId()).toBeUndefined();
  });
});
