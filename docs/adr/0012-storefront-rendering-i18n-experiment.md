# 0012. Storefront: ISR per price arm, URL-decided language, direct gateway calls

- Status: Accepted
- Date: 2026-10-19

## Context
Step 1.4. Nearly all visitors come from Facebook ads on mobile, so the storefront must be fast
(Lighthouse mobile >= 90) with little client JS. Two things vary per visitor: the language
(ads link straight to Bangla) and the price arm of the experiment (`?p=a|b`, and the same
visitor must always see the same price). The owner chose English as the default language.

## Decision
- **Language from the URL only**: `/en/...` and `/bn/...`; anything without a prefix redirects
  to `/en`. No cookie or Accept-Language guessing, so an ad link always opens the language it
  names. All copy comes from `docs/copy-en.md` / `docs/copy-bn.md` (a test checks every string
  against the docs); `[[...]]` items render as visible placeholders.
- **Price arm in a hidden route segment**: `proxy.ts` (Next 16 middleware) rewrites
  `/{lang}/...` to `/{lang}/{base|a|b}/...`. The arm comes from the `zq_p` cookie, else from
  `?p=a|b` (then stored for 90 days; the first one wins). No `?p` means the base price and no
  experiment; the seeded base price equals arm a, so nobody from an ad sees more than it showed.
  Each arm is its own ISR page (revalidate 5 min, rendered on first request, so builds never
  need the backend); there is no client JS for pricing. The cart is created with the arm, so
  checkout charges the price the visitor saw.
- **Browser -> gateway directly** (CORS) for cart, checkout, tracking, RFQ and events, so rate
  limits and Turnstile see the visitor's IP. The guest cart token is a first-party cookie the
  page's JS reads (it must be sent as a header); it grants access to an anonymous cart only.
- **First-party, anonymous visitor data**: `zq_sid` (random session id, 1 year) and first-touch
  UTM (`zq_utm`, 30 days) are sent with VIEW / ADD_TO_CART events and checkout. No personal data
  goes to analytics (ADR 0010). The Meta Pixel loads only when `NEXT_PUBLIC_META_PIXEL_ID` is set.
- **Turnstile**: without a site key (dev/CI) no widget renders and a dev token is sent; a
  production build fails without the key unless `ALLOW_TEST_TURNSTILE=true` (CI/e2e only).

## Consequences
- Three cached copies of each page (base, a, b) per language; fine at this catalog size.
- Search engines (no cookie, no `?p`) see the base price; Product JSON-LD marks pre-orders as
  `PreOrder`, never `InStock`.
- Changing the default language later is a one-line change plus redirects.
