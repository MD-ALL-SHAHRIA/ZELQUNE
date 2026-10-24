# @zelqune/dashboard

Zelqune admin dashboard (Next.js App Router) for OWNER and STAFF. Rules: [CLAUDE.md](CLAUDE.md).
It talks only to the gateway, takes API types from `@zelqune/api-client` and brand tokens from
`@zelqune/ui-tokens`.

## Run

```sh
cp dashboard/.env.example dashboard/.env.local   # NEXT_PUBLIC_API_URL, NEXT_PUBLIC_SITE_URL
pnpm infra:up                                   # gateway + services (CORS allows :3200)
pnpm --filter @zelqune/dashboard dev            # http://localhost:3200
```

Sign in with the owner account seeded from `infra/.env` (`OWNER_PHONE` / `OWNER_PASSWORD`).

## Pages

- **Overview**: GO counter, today's orders and revenue, the funnel, the price experiment.
- **Orders**: search and filter (TanStack Table), then per order: verify or reject a bKash/Nagad
  advance (amount received), confirm cash on delivery, move the status (only the moves the
  order-service state machine allows), notes, shipment.
- **Products**: names and descriptions (English and Bangla), sale mode, days to make, publish or
  archive, photos (presigned upload; the first real photo replaces the site's sample photos).
- **Home page**: the storefront home content (ADR 0015) in English and Bangla: announcement bar,
  hero words, hero scenes (photo, piece, position, order), trust strip (icon, title, line),
  collections row (which categories, order, cover photo), contact and social links. Saved with
  a version check; the site shows changes within a minute.

## Auth

The access token is kept in memory only; the refresh token is the gateway's httpOnly,
SameSite=Strict cookie on `/v1/admin/auth`. On load the dashboard refreshes the session; a 401
triggers one refresh and a retry. CUSTOMER accounts are refused.

## Tests

- `pnpm --filter @zelqune/dashboard test`: unit tests (Vitest).
- `E2E_ADMIN_PHONE=… E2E_ADMIN_PASSWORD=… pnpm --filter @zelqune/dashboard e2e`: Playwright
  against the running dashboard and dev stack (skips without credentials). The gateway allows
  5 sign-ins per 15 minutes per IP.
