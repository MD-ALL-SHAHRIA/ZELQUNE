# 0005. Observability: pino + x-request-id now; OpenTelemetry and Sentry in step 1.6

- Status: Accepted
- Date: 2026-10-19

## Context
The plan calls for pino logs, `/health`, OpenTelemetry traces and Sentry. Step 1.0 is the
skeleton; tracing and error reporting need deployment decisions (collector, DSN, sampling).

## Decision
Now: JSON pino logs with `service` and `requestId` on every line; `x-request-id` is accepted or
generated at the gateway and carried through TCP messages and event envelopes; `/health` per app
(dependency probes, 503 when any is down). Deferred to step 1.6: OpenTelemetry SDK + exporter,
and Sentry for gateway, storefront and dashboard.

## Consequences
- Requests can be followed across services by `requestId` in logs today.
- No distributed trace timings until 1.6; tracked in the README roadmap.
