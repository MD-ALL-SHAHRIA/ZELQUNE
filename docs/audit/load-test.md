# Load and stress test (2026-11-18)

Local only: production build of the storefront (`next start`, one process) and the dev Docker
stack (9 backend apps, Postgres, Redis, RabbitMQ) on one MacBook (10 cores, 16 GB); the load
generator ran on the same machine. No external server was tested. Tools: `ab` and a Node
closed-loop tester (status codes and bodies checked).

## Results (all responses correct, 0 errors in every run)

| Scenario | Users at once | Throughput | p95 latency |
|---|---|---|---|
| Home page `/en` | 50 | ~410 pages/s | 134 ms |
| Shop / product / story pages | 50 | 630–930 pages/s | 55–105 ms |
| API product list (rate limit raised) | 200 | ~2,400 req/s | 95 ms |
| API product detail | 200 | ~2,200 req/s | 119 ms |
| API home content | 50 | ~2,050 req/s | 33 ms |
| Cart flow: create, add item, read (DB writes) | 50 / 200 | ~185 / ~205 flows/s | 231 / 713 ms |
| Stress: home page | 100 → 1,000 | flat ~300–360 pages/s | 0.4 s → 3.7 s |
| Flood from one IP, rate limit on | 50 | 120 served/min, rest 429 | 22 ms |

## Reading
- Nothing failed: at 1,000 simultaneous users pages slow down (queueing) but every request is
  answered. The ceiling is the single storefront process (~350 pages/s), not the backend
  (catalog, Postgres and Redis stayed near idle because pages are cached).
- ~350 pages/s ≈ 1.2 million page views an hour from one process.
- Writes: ~200 cart sessions/s ≈ 700,000 carts an hour.
- The per-IP rate limit holds under a flood; checkout (10 per 10 min per IP) was not
  load-tested for the same reason.

## Before real traffic
1. Run the same tests once on the VPS after deploy (owner's server, owner's OK).
2. Scale pages first: Cloudflare caching for HTML pages, or 2–4 storefront containers.
3. Watch order-service and Postgres during sales; add a read replica only if needed.
