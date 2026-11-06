# Impeccable audit: storefront (2026-11-06)

**Scope:** `/en` home, `/en/shop`, a product page (`/en/products/capsule-vase-light`), `/en/checkout`, `/en/account/login`.
Also `/bn` and `/bn/shop` at phone width.

**Method:**
- Impeccable v4.8.0 detector (engine 0.1.18) on `frontend/src` and on each rendered page (`next dev`, desktop viewport).
- Playwright at 360 px for overflow and tap targets.
- Every finding checked in code and in screenshots.

**Ground rule (PRODUCT.md, binding):** keep the current look exactly. Fix real UI defects only.

## Audit Health Score

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 2 | "Bulk & Corporate" card text at 1.7:1. Several small labels below AA. |
| 2 | Performance | 3 | No issues on these pages (Lighthouse pass in PR #97). |
| 3 | Theming | 3 | `bg-walnut` flips to light brass inside a dark band. Footer uses hard-coded hex. |
| 4 | Responsive Design | 4 | No sideways scroll at 360 px. Targets ≥ 24 px (breadcrumbs are inline-text exceptions). |
| 5 | Implementation Integrity | 3 | Coherent, product-specific system. Isolated token misuse. |
| **Total** | | **15/20** | **Good** |

## Implementation Integrity Verdict
**Pass.** The storefront has its own system: espresso/cream/brass tokens, Cormorant + Jost, square
corners with the arch as the one curve, honest copy. The source scan found **no AI-slop patterns**
(no gradient text, purple gradients, nested cards, icon tiles or generic fonts). The rendered-page
warnings for `cream-palette`, `radial-spotlight-glow`/`radial-halo` (hero lamplight),
`kicker-above-heading` (section eyebrows), `marquee` (announcement bar) and
`repeating-stripes-gradient` are the brand's deliberate devices. They are **kept** under the binding
brand rule, not counted as defects.

## Executive Summary
- Score **15/20 (Good)**. Issues: P0 0 · P1 4 · P2 3 · P3 2.
- Top issues:
  1. Bulk & Corporate card: ivory text on light brass (token flips in `tone-dark`), 1.7:1.
  2. Language switch: the inactive language is 3.3:1.
  3. "Sample photo" notes at 9.6–11.2 px, some on photos at 55% opacity.
  4. Small text on cream boxes (product page) 4.0:1. Footer eyebrow on walnut 4.0:1.
- Next step: `/impeccable polish` restricted to these defects. No restyle.

## Detailed Findings

### P1 (WCAG AA failures)
- **[P1] Bulk & Corporate card unreadable**
  - Location: `features/landing/services.tsx` (`bg-walnut` card).
  - Category: Theming / Accessibility.
  - Impact: inside the dark services band, `--zq-walnut` becomes `#d9b47a`, so the ivory title, text and "Explore" sit at 1.6–1.7:1.
  - Standard: WCAG 1.4.3.
  - Fix: use the fixed walnut `#7a5c30` (the colour the code comment intends). Ivory on it is 5.9:1.
  - Command: `/impeccable polish`.
- **[P1] Inactive language link low contrast**
  - Location: `features/layout/language-switcher.tsx` (`opacity-55`).
  - Impact: "বাং"/"EN" at 3.3:1 on paper in every header.
  - Standard: 1.4.3.
  - Fix: `opacity-75` (≥ 4.5:1). Hover still goes to 100%.
- **[P1] Small text on cream boxes**
  - Location: `features/catalog/purchase.tsx` and `purchase.extras.tsx` (`text-ink/65`).
  - Impact: 4.0:1 on the delivery and "buy with confidence" boxes.
  - Fix: `text-ink/80`.
- **[P1] Footer eyebrow on walnut gradient**
  - Location: `features/layout/footer.tsx` (`text-[#f4dcb0]`, 0.7 rem uppercase).
  - Impact: 4.0:1.
  - Fix: a lighter tint of the same cream, `#fbeed6` (≥ 4.5:1). The look is the same.

### P2
- **[P2] "Sample photo" notes too small or too faint**
  - Location: `features/landing/day-night.tsx` (0.6 rem, `ivory/55` on photos), `bulk/page.tsx` (0.6 rem, `ivory/50`), `featured-product.tsx`, `listing-page.tsx`, `materials.tsx` (0.7 rem).
  - Impact: 9.6–11.2 px, partly below 4.5:1 on photos.
  - Fix: 0.75 rem (12 px). Ivory at 80% on photos.
- **[P2] Filter counts in the shop bar**
  - Location: `features/catalog/listing-grid.tsx` (`sup`, 0.62 rem `text-stone` over the blurred bar).
  - Impact: about 10 px at 3.7:1.
  - Fix: 0.7 rem, `text-ink/75`.
- **[P2] Header category tabs at 10.9 px**
  - Location: `features/layout/header-styles.ts` (`text-[0.68rem]`).
  - Impact: just under the 11 px floor (advisory 4.3:1 on one tab).
  - Fix: `0.6875rem` (11 px). Visually identical.

### P3
- **[P3] Orphan words** in two home paragraphs ("Bangladesh.", "cash."). Fix: `text-pretty` on those paragraphs.
- **[P3] Detector advisories for font sizes off the DESIGN.md ramp (173)**. This is documentation drift, not a UI defect: the ramp in DESIGN.md is coarse. Record the label steps (0.68–0.78 rem) in DESIGN.md later. No code change.

### False positives (checked)
- `cramped-padding` on the shop's sticky filter bar: its background matches the page, so there is no visible box edge.
- Rendered `low-contrast` on hero text over photos: the gradient scrim is not sampled by the detector.

## Patterns & Systemic Issues
- **Theme-flipping tokens used as fixed colours.** `walnut` is right on paper but becomes brass inside `tone-dark`. Any `bg-walnut` with ivory text in a dark band will repeat the bug.
- **Faded ink by opacity** (`/55`, `/65`) is the usual cause of contrast misses on cream and sand. DESIGN.md's AA Rule now says `ink/80` or stronger for small text there.

## Positive Findings
- No sideways scroll at 360 px in either language. Bangla is never letter-spaced (checked).
- Reduced motion is respected. There are skip links, landmarks and labelled form fields.
- Consistent tokens and components. Honest content (no fake reviews or scarcity).

## Recommended Actions
1. **[P1] `/impeccable polish`**: services card colour, language switch, cream-box text, footer eyebrow.
2. **[P2] `/impeccable polish`**: sample-photo notes, shop filter counts, header tab size.
3. **[P3] `/impeccable typeset`**: orphans only; record label sizes in DESIGN.md (`/impeccable document`).

You can ask me to run these one at a time, all at once, or in any order you prefer.

Re-run `/impeccable audit` after fixes to see your score improve.
