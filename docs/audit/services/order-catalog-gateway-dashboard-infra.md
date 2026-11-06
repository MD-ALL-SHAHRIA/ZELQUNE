# Second pass: order, catalog, gateway, dashboard, infra (2026-11-06)

Covers the areas `02-final-report.md` listed as "not audited yet". This pass reads the risky paths
only (money, access, uploads, links), not every file. The frontend got a narrow look: raw HTML and links.

## Checked, OK
- **Gateway access.** Default-deny `JwtAuthGuard`. Every admin controller has class-level
  `@Roles('OWNER','STAFF')`, and owner-only routes (team, settings writes, expenses, P&L, audit
  log, privacy) add `@Roles('OWNER')`. Customer routes use `@Roles('CUSTOMER')` /
  `@RequireAccount`. `@OptionalAccount` treats non-customer tokens as guests. Tokens: ES256,
  issuer, audience and `typ=access` checked, 15 min TTL. The dashboard keeps the token in memory.
- **Refresh cookie.** httpOnly, `SameSite=Strict`, `Secure` by default, path limited to
  `/v1/admin/auth`, plus an Origin check. CORS echoes only `CORS_ORIGINS`.
- **Rate limits.** Shared storage, client IP from `TRUST_PROXY`. Checkout, cart writes, tracking,
  login, RFQ, auth emails and beacons each have their own limit.
- **Checkout (order-service).** The body never sets prices: lines, shipping and coupon are priced
  server-side (`CartService.prepare`), and the account comes from the verified token. The final
  transaction locks the saga and the cart (`FOR UPDATE`). A cart can become only one order, even
  with different Idempotency-Keys. The coupon is redeemed with a guarded `UPDATE ... used_count <
  max_uses`, so it cannot be over-used. Compensation and the stale-saga poller are idempotent.
- **Order lookup (IDOR).** Public tracking needs code and phone, with the same 404 for either
  wrong. Codes are random (31^6) and tracking is rate-limited. Portal lists filter by the token's
  user id (zod uuid).
- **Catalog uploads.** Only webp/jpeg/png/avif, so no SVG. Signed URLs bind key, type, size and
  expiry. The local fake rejects path traversal and oversize bodies. R2 is configuration only (ADR 0007).
- **Storefront HTML.** The only `dangerouslySetInnerHTML` are the theme script (a constant) and
  JSON-LD through `jsonForScript`, which escapes `<`.
- **Infra (dev compose).** Every port binds to 127.0.0.1. Passwords come from env, with dev defaults.

## Fixed in this pass

| ID | What | Test |
|---|---|---|
| CAT-SEC-1 | Home-page client links and shipment tracking links accepted any URL scheme (`z.url()` allows `javascript:` and `data:`). Staff could save a link that runs script when a customer clicks it. React 19 blocks `javascript:` hrefs, so this is defence in depth, but `data:` and other schemes passed too. Both now use `z.httpUrl()`. | `content.contracts.spec.ts` (3 of 4 fail on old code) |
| DASH-SEC-1 | The dashboard sent no CSP or nosniff. It now sends `frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'` and `nosniff`. Script restrictions need Next nonces: later. | headers only (build) |

## Open (no code change yet)

| ID | Severity | What | Suggested fix |
|---|---|---|---|
| DEPLOY-1 | High at deploy | `infra/docker-compose.yml` runs every app with `NODE_ENV=production` while it is the dev stack. Production-only checks (e.g. `INTERNAL_RPC_SECRET`) apply in dev too. Production-only guards can't be added without breaking dev. | Before the VPS deploy, write a separate production compose/env: real passwords, no dev defaults, `COOKIE_SECURE=true`, `TRUST_PROXY` set to the proxy hop count. |
| CAT-OPS-1 | Medium at deploy | With `STORAGE_DRIVER=local`, an unset `LOCAL_STORAGE_SIGNING_SECRET` gives a random secret per process, so upload URLs break after a restart. `MEDIA_PUBLIC_BASE_URL` defaults to localhost. | In production, set both, keep the `media-data` volume and back it up, or switch to R2 (needs approval). |
| GW-SEC-1 | Low | Swagger UI and `/v1/docs-json` are public in every environment. They list admin routes, which still need auth. | Serve them only when an `API_DOCS=true` flag is set (`pnpm gen:api` uses the script, not the route). |
| ORD-1 | Low | Fixed: the redeem `UPDATE` now also checks `ends_at`; an expired coupon reports EXPIRED (`saga.store.spec.ts`, 2 of 3 fail on old code). | done |
| GW-AUTH-1 | Low | Deactivating a team member stops refresh, but their access token works for up to 15 min. | Acceptable at this size. Shorten the TTL, or check a deny-list in Redis, if staff grows. |

## Not covered
Order quotes, privacy and reports in depth. Catalog admin pricing and promotions logic. Frontend
state and forms beyond links and raw HTML. DB grants per service role.
