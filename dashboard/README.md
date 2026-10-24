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

## Design

Modelled on Shopify Polaris, Stripe and Linear: a fixed sidebar (with a live "payment check"
count on Orders), ⌘K search for pages, products and orders, Geist for the interface with the
logo's Cormorant for the wordmark, day and night themes (the shared Dark Walnut tokens), toasts
for finished actions, skeletons while loading, and an "unsaved changes" bar on every form.
Charts follow the dataviz rules (validated colours, one series per chart unless legended, hover
tooltips, empty states).

## Pages

- **Home**: greeting and a date range (today, 7 or 30 days) driving four KPI cards with change
  versus the previous period and sparklines; revenue area chart with a crosshair tooltip; the GO
  counter ring; the order pipeline (click a step to filter orders); the conversion funnel; the
  price test (A vs B); recent orders.
- **Orders**: status tabs with counts, search (also from ⌘K), sortable dense table, CSV export,
  pages. Each order: one primary next step in the header (for example "Verify payment"), other
  moves with a reason dialog, items and totals, payment card (verify with the amount received,
  reject with a reason, confirm COD), a timeline of status changes and team notes, customer
  (call, WhatsApp), delivery address, shipment and attribution.
- **Products**: status tabs, search, thumbnails and prices; each product: title and description
  with an English/Bangla switch, drag-and-drop photos, finishes with SKU and price, status
  (publish/archive) and how it is sold.
- **Home page**: Stripe-style settings sections with a live hero preview and an English/Bangla
  switch (empty translations flagged): announcement bar, hero words, hero scenes (photo, piece,
  positions, order), trust strip, collections row and covers, contact and social links.

## Auth

The access token is kept in memory only; the refresh token is the gateway's httpOnly,
SameSite=Strict cookie on `/v1/admin/auth`. On load the dashboard refreshes the session; a 401
triggers one refresh and a retry. CUSTOMER accounts are refused.

## Tests

- `pnpm --filter @zelqune/dashboard test`: unit tests (Vitest).
- `E2E_ADMIN_PHONE=… E2E_ADMIN_PASSWORD=… pnpm --filter @zelqune/dashboard e2e`: Playwright
  against the running dashboard and dev stack (skips without credentials). The gateway allows
  5 sign-ins per 15 minutes per IP.
