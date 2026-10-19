import { type Actor } from '../audit/audit.contracts';

/** Metadata carried on every gateway -> service TCP message. */
export interface RpcMeta {
  requestId: string;
  /** The authenticated admin making the call (for audit), if any. */
  actor?: Actor;
}

export interface RpcRequest<TData = unknown> {
  meta: RpcMeta;
  data: TData;
}

/** Shape of an error returned by a service over TCP; the gateway maps it to HTTP. */
export interface RpcErrorPayload {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

export function isRpcErrorPayload(value: unknown): value is RpcErrorPayload {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.status === 'number' && typeof v.code === 'string' && typeof v.message === 'string'
  );
}
