# 0019. Cookie consent: nothing optional before a "yes"

- Status: Accepted
- Date: 2026-11-01

## Context
The audit (`docs/compliance/audit-2026-10-31.md`, H1/C2) found analytics cookies (`zq_sid`,
`zq_utm`) set on the first request and the Meta Pixel loading without consent. The owner wants
Pixel support kept for future ads (2026-10-31).

## Decision
- Three categories: **Necessary** (cart, consent, theme, Turnstile; always on), **Analytics**
  (`zq_sid`, `zq_utm`, our own funnel beacons), **Marketing** (Meta Pixel).
- The choice is one first-party cookie, `zq_consent` = `v1.a{0|1}.m{0|1}`, kept 180 days.
  Bumping `CONSENT_VERSION` asks everyone again.
- `proxy.ts` sets analytics cookies only with analytics consent and deletes them otherwise, so a
  refusal or withdrawal takes effect on the next request; the browser store does the same at once.
  Beacons already require `zq_sid`, so no beacon is sent without consent.
- The Pixel script renders, and Pixel events fire, only with marketing consent; withdrawing it
  reloads the page so the loaded script is gone.
- Banner: Accept all / Reject all / Customize with equal weight, non-blocking, first in the tab
  order; settings dialog (Radix: focus trap, Esc) reachable from the footer and the Cookie Policy.

## Consequences
- Funnel analytics now cover only consenting visitors; numbers will drop and that is expected.
- E2E tests start with a saved choice (`playwright.config.ts` storageState) except
  `e2e/consent.e2e.ts`, which starts empty.
- Whether Bangladesh law requires prior consent for first-party analytics is an open legal
  question; this design meets the stricter reading either way.
