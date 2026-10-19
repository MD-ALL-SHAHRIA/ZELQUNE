import { ZodError } from 'zod';

/** Throw from a handler when retrying cannot help (bad data, broken invariant). Goes to the DLQ. */
export class NonRetryableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'NonRetryableError';
  }
}

export type FailureAction =
  | { kind: 'retry'; attempt: number; queue: string }
  | { kind: 'dead-letter'; reason: 'non-retryable' | 'retries-exhausted' };

/**
 * Decides what to do with a failed message. Malformed messages (JSON/contract errors) and
 * NonRetryableError go straight to the DLQ; anything else is retried through each delay queue.
 */
export function decideFailureAction(
  error: unknown,
  previousRetries: number,
  retryQueues: { name: string }[],
): FailureAction {
  if (
    error instanceof NonRetryableError ||
    error instanceof ZodError ||
    error instanceof SyntaxError
  ) {
    return { kind: 'dead-letter', reason: 'non-retryable' };
  }
  const next = retryQueues[previousRetries];
  if (!next) return { kind: 'dead-letter', reason: 'retries-exhausted' };
  return { kind: 'retry', attempt: previousRetries + 1, queue: next.name };
}

export function retryCountOf(headers: Record<string, unknown> | undefined): number {
  const value = Number(headers?.['x-retry-count'] ?? 0);
  return Number.isInteger(value) && value >= 0 ? value : 0;
}
