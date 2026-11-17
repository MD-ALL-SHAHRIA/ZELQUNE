# Pre-deployment checklist (2026-11-18)

The owner's 13-section checklist, item by item. Builds on the 2026-11-06 audit (`02-final-report.md`,
`services/`), the code quality pass (`code-quality.md`) and the performance pass
(`frontend-performance.md`).

**Key:** ✅ checked and OK · 🔧 fixed in this round (PR) · 👤 needs the owner (sign-up, server,
keys) · 🚀 can only be checked on the live server · ⚠️ open, accepted for launch

**Final status: Ready after fixes.** There are no critical or high issues left in the code once
#108, #110, #112 and #113 are merged. Before going live, the owner needs to do the 👤 items in
`docs/deploy.md`. After going live, run the 🚀 checks.

## 1. Code quality
✅ syntax · ✅ TypeScript (strict everywhere, 0 errors) · 🔧 unused variables/imports (0; stale
lint directives removed, #110) · 🔧 duplicate code (4 duplicates merged, #110) · ✅ unnecessary
dependencies (none) · 🔧 dead code (11 unused functions/components + 2 files removed, #110) ·
✅ error handling · ✅ naming · ✅ structure and architecture (no layer or service boundary
violations) · ✅ hardcoded secrets (none) · ✅ maintainability / reusability / SOLID (per-service
modules, shared contracts, provider interfaces) · ⚠️ `dashboard/.../content/page.tsx` is 982
lines; split it later.

## 2. Functional testing
✅ Covered by the automated tests that run in CI on every PR: registration, email confirmation,
login/logout, forgot and reset password, guest and account checkout, pre-order with a bKash
advance, COD, order tracking, search (English and Bangla), filters, sort, consultation /
construction / bulk requests, privacy request, cookie consent, admin (home page editing, orders,
coupons, settings, finance). Backend: 350+ unit/e2e tests and 64 integration tests against real
Postgres/RabbitMQ/Redis. RBAC: default-deny guard plus `@Roles` on every admin route.
👤🚀 Real bKash/Nagad numbers and real email delivery: test once on the live site.

## 3. Backend and API
✅ endpoints, response envelope, status codes, zod validation, ES256 JWT auth, role-based
authorization, rate limits (login, checkout, cart, tracking, requests, emails), idempotency keys,
outbox + retries + DLQ, RPC timeouts, OpenAPI with `/v1` versioning · 🔧 API docs off in production
(`API_DOCS=false`, #112) · 🔧 courier double-booking (#112) · 🔧 SMS re-sent on retry (#112)
· 🔧 confirmed order losing its stock deduction (#112) · ⚠️ analytics funnel query scans the
events table (fine at launch volume; events are deleted after 90 days).

## 4. Database
✅ one schema and one role per service, foreign keys, unique constraints (one shipment, one log
per event, coupon use), indexes, Prisma migrations applied at start, transactions with row locks
on money and stock paths, passwords hashed with argon2id · 🔧 backups: nightly dump + photos,
14 days, restore script tested (#113) · 👤 copy backups off the server regularly.

## 5. Security
✅ SQL injection (Prisma, parameterised raw SQL) · ✅ XSS (React escaping; JSON-LD escaped; links
only http(s)) · ✅ CSRF (SameSite=Strict refresh cookie + Origin check; bearer tokens) · ✅ access
control / IDOR (order lookup needs code + phone; portal filtered by the token's user) · ✅ JWT
(ES256, issuer, audience, 15 min) · ✅ argon2id passwords · ✅ CORS (allow-list only) · ✅ security
headers (CSP, HSTS, frame DENY, nosniff, referrer) · ✅ file uploads (image types only, signed
URLs, size limit) · ✅ brute force (login lockout per phone and per IP) · ✅ sessions (httpOnly
refresh cookie, rotation, revocation) · 🔧 dependency audit: Next.js 16.4.6 (#108); shipped code
has 0 high/critical; CI gate added (#113) · 🔧 HTTPS enforced with HSTS via Caddy (#113) · ⚠️
`picomatch` (high) inside the Nest CLI build tool only, no fix published; it never runs on the
server.

## 6. UI/UX and responsive
✅ Chrome, Safari (WebKit) and Firefox at 390 px, 820 px and 1440 px on home, shop, product,
checkout, design, Bangla home and 404: no JS errors, no sideways scroll · ✅ 404 page (real 404
status in production), error pages (`error.tsx`, `global-error.tsx`) · ✅ loading, empty and error
states, form messages (e2e) · ⚠️ dev-only React warning on the 404 page (the theme script is
re-rendered on the client); no effect on visitors · 🚀 check on a real iPhone and Android phone once.

## 7. Performance
✅ Lighthouse (2026-11-06): mobile 88–92, desktop 99–100; LCP 0.9 s on desktop · ✅ image
optimisation (custom loader, WebP), lazy loading, code splitting (dialogs load on open) · ✅
caching (ISR 60 s, Redis public cache in the gateway) · 🔧 gzip/zstd compression in Caddy (#113)
· ⚠️ load and stress testing not done (needs the real server) · 👤 CDN: Cloudflare proxy is
optional after HTTPS works (`docs/deploy.md`).

## 8. SEO and accessibility
✅ titles, meta descriptions, canonical URLs, `hreflang` en/bn, `sitemap.xml` (26 URLs),
`robots.txt` (checkout and order pages excluded, AI-training bots blocked), Open Graph images,
JSON-LD, alt text on every image, one `h1` per page, semantic HTML, keyboard navigation (e2e),
Lighthouse accessibility 100 · 👤🚀 Google Search Console verification and sitemap submission.

## 9. Production configuration
🔧 production compose with no dev defaults, every secret required, `NODE_ENV=production`, debug
off, API docs off, `COOKIE_SECURE`, `TRUST_PROXY`, CORS limited to the real domains, JSON logs
with rotation (#113) · ✅ production builds pass · 👤 fill `infra/.env.production` (Turnstile keys,
SMTP provider, bKash/Nagad numbers, owner account).

## 10. Testing and automation
✅ unit, integration, e2e (storefront + dashboard), visual screenshot run; CI on every PR
(lint, typecheck, format, tests, builds, e2e) · 🔧 weekly dependency audit (#113).

## 11. Deployment and infrastructure
🔧 Docker images for all apps, Caddy reverse proxy with automatic HTTPS, only ports 80/443
published, health checks on every container, release tags for rollback, update steps (#113,
`docs/deploy.md`, ADR 0025) · 👤 VPS purchase, firewall (ufw commands in the guide), DNS records
· ⚠️ updates restart containers (a few seconds of downtime); no load balancer (one server).

## 12. Logging, monitoring and reliability
✅ structured JSON logs (pino) with request IDs, `/health` on every service, container restart
policies · 🔧 log rotation, nightly backups, a restore that was actually tested (#113) · 👤 uptime
monitor (UptimeRobot / Better Stack free plan) and error tracking (Sentry free plan): sign-ups,
so not done.

## 13. Post-deployment verification
🚀 All items run on the live server; the list is in `docs/deploy.md` §7 (pages load with a
padlock, `/docs` returns 404, a test COD order, logs clean).
