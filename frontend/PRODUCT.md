# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Home buyers in Bangladesh, mostly arriving on phones from Facebook and Instagram, buying
handcrafted wood-and-light home decor (wall panels, shelves, lamps). They may order before the
piece is made (pre-order), have it made for them (made-to-order), or buy what is in stock.
Secondary: businesses asking for bulk/corporate orders, interior design and construction work.

## Product Purpose
Zelqune's storefront: browse pieces, see the real price and delivery date, and order with a
৳300 bKash/Nagad advance or cash on delivery, as a guest or with an account. Customers track
orders, and businesses send requests. Success: strangers trust the site enough to pay an advance.

## Positioning
Handcrafted in Dhaka, wood and warm light in one piece, made to order with clear lead times.
Honest by rule: no invented reviews, ratings, sold counts, scarcity or countdowns.

## Operating Context
Bilingual: English (`/en`, default) and Bangla (`/bn`); the URL decides the language. Mobile-first
on 4G. Payments by manual bKash/Nagad Transaction ID or COD. Owner and staff edit home-page
content, products and settings in the admin dashboard.

## Capabilities and Constraints
Next.js App Router, statically prerendered pages (ISR), talks only to the gateway API.
Lighthouse mobile ≥ 90. All copy comes from `docs/copy-en.md` and `docs/copy-bn.md`.
Bangla text is never letter-spaced or uppercased. Pages must not scroll sideways on phones.
Never say "in stock" for a pre-order product.

## Brand Commitments
**Binding (owner, 2026-11-06): keep the current look exactly.** Brand colours (espresso,
cream, brass; tokens in `packages/ui-tokens`), the logo, Cormorant Garamond + Jost, all copy and
all layouts stay. Design work fixes real UI defects only (overflow, spacing, alignment,
contrast, broken or missing states). It does not restyle or redesign.

## Evidence on Hand
Product photos come from the catalog. Sample and stock imagery are credited in `public/videos/CREDITS.md`
and `src/content/sample-images.ts`. No customer testimonials, reviews or press exist yet. Do not fabricate them.

## Product Principles
1. Trust before persuasion: price, advance, delivery date and refund terms are always visible.
2. Phone first: every flow works one-handed on a small screen over 4G.
3. Two languages, equal care: Bangla is never an afterthought.
4. Honest by rule: show only what is true.

## Accessibility & Inclusion
WCAG 2.2 AA: contrast, keyboard access, reduced motion respected, screen-reader labels in both languages.
