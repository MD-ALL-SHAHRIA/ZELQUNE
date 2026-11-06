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

## Remaining risks, ranked
1. **High.** ID-SEC-1 and ID-SEC-2, identity takeovers (above).
2. **High once paid SMS or couriers go live (M3).** NOTIF-MSG-1: an SMS sent inside the consumer transaction is re-sent on retry. SHIP-MSG-1: a shipment can be double-booked.
3. **Medium.** Stock consistency between inventory and order-service (INV-MSG-1 and INV-MSG-2). The gap between payment and auto-cancel (PAY-ARCH-1). Analytics retention and the scan on `tracked_events`.
4. **Medium, deploy rule.** TCP between services is unauthenticated (ARCH-001). Production must keep ports 4001–4008 private.
5. **Not audited yet.** order-service (checkout saga, coupons, order lookup IDOR), catalog (uploads, content XSS), gateway routes in depth, frontend, dashboard, infra and DB grants. The audit agents for these stopped at the usage limit, so these need a second pass. That pass matters most for order-service and the gateway.

## Not verifiable without staging
- A real broker restart and consumer recovery (the code uses amqp-connection-manager; I didn't test it live).
- Pool sizing against Postgres `max_connections` with 8 services.
- Agent-reported findings marked Likely (L) or "Needs runtime check" (R) in services/.
- The bKash/Nagad P2002 error mapping, which depends on the text of Prisma's error detail.
