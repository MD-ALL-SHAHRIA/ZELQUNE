# 02 — Final report (audit 2026-11-06, branch `audit/full-review`)

## Fixed (each has a regression test where it is a code change)

| ID | Commit | What | Test |
|---|---|---|---|
| SEC-001 | 6a6e221 | next 16.3.8 → 16.4.1 (frontend + dashboard), zod 4.6.5 → 4.6.7, Nest 11.2.8, overrides body-parser ≥2.4 / multer ≥2.5 | pnpm audit |
| SEC-002 | ebe8186 | Console SMS log: masked phone, no body outside development | `sms.provider.spec.ts` (fails on old code) |
| SEC-003 | 94e174f | SMTP `requireTLS` when credentials are set | `email.provider.spec.ts` |
| MSG-001 | 696f84d | Expiry sweeper skips and logs a failing reservation instead of stalling | `inventory.sweep.spec.ts` |
| QUAL-001 | 994ac80 | Integer volumetric weight (no extra-kg overcharge) | `shipping-fee.spec.ts` (fails on old code) |
| SEC-004 | a3196dd | helmet on the gateway (CSP off for JSON + Swagger UI) | `gateway.e2e-spec.ts` headers test |
| QUAL-002 | d3f88c2 | 60 s jest timeout (e2e boot under parallel load) | full suite green via turbo |

## Before / after

| Metric | Before (main 7d3d959) | After |
|---|---|---|
| lint | pass, 3 warnings | pass, 3 warnings (unchanged, not touched) |
| typecheck | pass | pass |
| backend tests | 308/330 pass under load (22 timeouts) | **338/338** pass, also under turbo parallel load |
| frontend / dashboard tests | 19 / 2 files pass | 19 / 2 files pass |
| builds | backend, dashboard pass; frontend needs `ALLOW_TEST_TURNSTILE=true` | same (frontend 31 s; largest chunk 73 KB gz) |
| pnpm audit | 37 (2 critical, 9 high, 22 moderate, 4 low) | **31 (0 critical, 5 high, 22 moderate, 4 low)**; all 5 high are nodemailer (needs approval) |
| direct deps | – | +1 (`helmet` 8.3.0 in backend) |

## Needs your decision
See the approval list in [01-findings.md](01-findings.md#needs-your-approval-ground-rule-4). The top three:
1. **ID-SEC-1 (High).** A customer can take over the dashboard by squatting a future staff member's phone number.
2. **ID-SEC-2 (High).** An attacker can register a victim's email before the victim does and keep their own password on the account.
3. **SEC-005 (High).** Upgrade nodemailer to 10.x, a major-version jump.

## Round 2 (owner-approved, 2026-11-06)

| Item | Commit | What | Test |
|---|---|---|---|
| ID-SEC-1 | 3c31085 | Team create refuses a phone already on a customer account (409 `PHONE_USED_BY_CUSTOMER`); seed refuses too; customer email/reset links never act on dashboard accounts | `team.service.spec.ts` (fails on old code) |
| ID-SEC-2 | 3c24dfe | Second sign-up on an unverified email marks it contested (`users.signup_contested_at`); verifying then clears the password and all sessions/links/social logins; the inbox owner sets a password from the account page. Unverified accounts still cannot sign in | `customer-signup.spec.ts` (fails on old code) |
| SEC-005 | 204a541 | nodemailer 7.0.10 -> 10.2.1. Breaking changes 8–10 (NoAuth->ENOAUTH, TLS on remote content, Node ≥ 20) do not touch our SMTP usage; `@types/nodemailer` removed (own types) | notification tests + runtime smoke |
| Restock | 1051d24 | `order.cancelled` on a COMMITTED reservation returns units with a RETURN movement, once (`stock_reservations.restocked_at`) | `inventory.restock.spec.ts` |
| Auto-cancel | 4ab895d | 48 h sweep skips orders whose payment is SUBMITTED (asks payment-service; also skips if it cannot answer) | `checkout.int-spec.ts` keep -> reject -> cancel |
| Retention | 03df489 | `tracked_events` older than 90 days deleted every 6 h in batches (index on `occurred_at`); order facts stay | `retention.service.spec.ts` |
| Erasure | 7b3bc9e | identity consumes `privacy.erased`: customer account anonymised and deactivated, row id kept for retained orders; ADR 0020 updated | `privacy.handlers.spec.ts` |
| TCP auth | 0674a69 | `INTERNAL_RPC_SECRET` on every internal call, 401 otherwise; required in production (ADR 0024) | `rpc.spec.ts` + all integration tests run with it |

Results: lint and typecheck pass; backend **349/349** unit/e2e, **64/64** integration (real
Postgres/RabbitMQ/Redis); frontend 19 and dashboard 2 test files pass; backend, dashboard and frontend
builds pass. pnpm audit: **10 (0 critical, 0 high, 7 moderate, 3 low)**, down from 37.

Migrations added (all additive, nullable or index only): identity `signup_contested_at`, inventory
`restocked_at`, analytics index `tracked_events(occurred_at)`.

**Before the next deploy:** run `pnpm keys:dev` locally (done on this machine). In production, set
one `INTERNAL_RPC_SECRET` (32+ chars) for every app, or they refuse to boot.

**Residual risk (ID-SEC-2):** if the real owner never signs up but clicks the link from the
attacker's first sign-up, the attacker's password stays. Closing this fully means asking for the
password on the verify page (frontend change).

## Remaining risks, ranked
1. ~~High: ID-SEC-1/2 identity takeovers~~ fixed in round 2 (see the residual ID-SEC-2 note).
2. **High once paid SMS or couriers go live (M3).** NOTIF-MSG-1: an SMS sent inside the consumer transaction is re-sent on retry. SHIP-MSG-1: a shipment can be double-booked.
3. **Medium.** Stock consistency between inventory and order-service (INV-MSG-1 and INV-MSG-2). The gap between payment and auto-cancel (PAY-ARCH-1). Analytics retention and the scan on `tracked_events`.
4. **Medium, deploy rule.** TCP now needs the shared secret (ADR 0024), but ports 4001–4008 must still stay private.
5. **Not audited yet.** order-service (checkout saga, coupons, order lookup IDOR), catalog (uploads, content XSS), gateway routes in depth, frontend, dashboard, infra and DB grants. The audit agents for these stopped at the usage limit, so these need a second pass. That pass matters most for order-service and the gateway.

## Not verifiable without staging
- A real broker restart and consumer recovery (the code uses amqp-connection-manager; I didn't test it live).
- Pool sizing against Postgres `max_connections` with 8 services.
- Agent-reported findings marked Likely (L) or "Needs runtime check" (R) in services/.
- The bKash/Nagad P2002 error mapping, which depends on the text of Prisma's error detail.
