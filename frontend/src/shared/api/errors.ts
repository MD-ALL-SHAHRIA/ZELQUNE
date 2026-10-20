import { ApiError } from './types';

/** RTK Query / fetch failures -> ApiError with the gateway's error code (or NETWORK). */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error && typeof error === 'object' && 'status' in error) {
    const { status, data } = error as { status: unknown; data?: unknown };
    if (typeof status === 'number') return ApiError.from(status, data);
  }
  return new ApiError(0, 'NETWORK', 'Network error');
}
