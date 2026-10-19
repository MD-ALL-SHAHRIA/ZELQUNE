# 0009. Event consumers retry through delay queues before the DLQ

- Status: Accepted
- Date: 2026-10-19
- Resolves: issue #2

## Context
Consumers dead-lettered on the first failure, so a transient database or network error dropped
an event out of normal processing until someone replayed it.

## Decision
- Per consuming service: main queue `<svc>.events`, delay queues
  `<svc>.events.retry.<delay>ms` (message TTL, dead-lettering back to the main queue through the
  default exchange) and `<svc>.events.dlq`.
- On a handler failure the consumer republishes the message to the next delay queue **with a
  broker confirm, then acks** the original (never lost); `x-retry-count` tracks attempts.
  Delays come from `EVENT_RETRY_DELAYS_MS` (default `5000,30000,120000`).
- Malformed JSON, envelope/contract (zod) errors and `NonRetryableError` go **straight to the DLQ**;
  so does a message that exhausted its retries.
- Idempotency is unchanged: `(event_id, handler)` in `processed_events` is written in the
  handler's transaction, so a retry after a partial failure has no double effect.
- Queue names contain the delay, so changing the delays never conflicts with existing queue
  arguments; consumers assert the topology before binding.

## Consequences
- Transient failures heal on their own within ~2.5 minutes.
- Old delay queues remain after a delay change; remove them during deploys if unused.
- A DLQ replay tool for operators is still to do (admin tooling).
