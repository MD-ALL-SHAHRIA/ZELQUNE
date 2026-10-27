# 0018. Short Redis cache for public catalog and content reads

- Status: Accepted
- Date: 2026-10-27

## Context
A local load test (2026-10-26) showed the gateway serving the public product list at about 60
requests per second while Postgres sat at 2% CPU: the cost is the gateway → catalog RPC and
serialisation, repeated for identical anonymous requests. The storefront already renders with
ISR (60 s), but every revalidation, sitemap and client-side catalog call still reached the service.

## Decision
- `PublicCacheInterceptor` on the public `catalog` and `content` controllers: GET responses are
  stored in Redis for `PUBLIC_CACHE_SECONDS` (default 30, 0 disables), keyed by the full URL so
  price buckets (`?p=a|b`) and pages stay separate. `X-Cache: HIT|MISS` for debugging.
- `Cache-Control: public, max-age=N, stale-while-revalidate=2N` so a CDN (Cloudflare, at go-live)
  can hold the same window at the edge.
- Checkout and admin routes are never cached; checkout prices come from a fresh RPC snapshot.
- Redis failures fall through to the service (no caching, no errors).
- Response compression is left to the reverse proxy / CDN (Brotli), not Node, because the
  gateway's CPU is the bottleneck.

## Consequences
- Owner edits reach the storefront within about 90 s (30 s cache + 60 s ISR) instead of 60 s.
- Integration tests run with the cache off because they change data and read it straight back.
