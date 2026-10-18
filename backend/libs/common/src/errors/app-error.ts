/** Expected, client-facing failure. `code` is a stable SCREAMING_SNAKE identifier. */
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
