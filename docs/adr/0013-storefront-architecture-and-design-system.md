# 0013. Storefront architecture: feature folders, RTK Query, and a brand design system

- Status: Accepted
- Date: 2026-10-20

## Context
The owner asked for a world-class storefront (references: RH, Ferm Living), built on their logo,
with Redux / RTK Query for API calls and a senior-level structure. Step 1.4 (ADR 0012) shipped
working pages with ad-hoc components and a hand-rolled cart context.

## Decision
- **Structure (feature-sliced):**
  `app/` routes only (thin server components) · `features/<domain>/` (catalog, cart, checkout,
  orders, quotes, analytics, landing, layout) · `shared/ui` (design system) · `shared/lib`
  (pure helpers, unit tested) · `shared/api` (server data + error types) · `store/` · `i18n/` ·
  `config/env.ts` (zod-validated public env) · `content/` (sample imagery).
- **Server data stays server-side:** catalog pages fetch in Server Components and are cached
  with ISR (ADR 0012). RTK Query is not used on the server.
- **Browser data through RTK Query:** endpoints are **generated** from the gateway OpenAPI spec
  (`@rtk-query/codegen-openapi`, `pnpm gen:store`) and enhanced with cache tags. Never edited by
  hand, consistent with "never hand-write API types".
- **Cart:** the cart query is the single source of truth; thunks create the cart on first add,
  replace a lost cart once, and write mutation results straight into the cache (no refetch).
  The cart token lives in the store and is mirrored to the `zq_cart` cookie by a listener.
- **Side effects in listeners, not components:** components dispatch domain events
  (`productViewed`, `cartItemAdded`, `checkoutStarted`, `orderPlaced`); the listener middleware
  sends analytics beacons and Meta Pixel events (still off without `NEXT_PUBLIC_META_PIXEL_ID`).
- **Design system from the logo:** ink-on-cream palette with walnut and amber "lamp glow"
  accents (`@zelqune/ui-tokens` v2); Cormorant Garamond for display (close to the wordmark),
  Manrope for text, Hind Siliguri for Bangla (self-hosted, preloaded on /bn only); square edges with the arch as
  the single curved motif; motion is CSS-only (scroll-driven reveal) and respects reduced motion.
- **Images:** sample photography (Unsplash License) stands in until real product photos are
  uploaded; catalog media always win. A custom next/image loader lets Unsplash's CDN resize
  samples, while catalog media go through Next's optimizer.

## Consequences
- About 20 KB (gzip) more client JavaScript for Redux Toolkit; Lighthouse is re-measured and
  must stay >= 90 on mobile.
- Customer login (M2) will be server-side through identity-service with httpOnly cookies; a
  separate auth library such as Better Auth would duplicate identity-service and is not used.
- Sample photos and their "sample photo" notes must be removed before launch (`content/`).
