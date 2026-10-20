# @zelqune/frontend

Zelqune storefront: Next.js 16 App Router, English (`/en`, default) and Bangla (`/bn`).
Rules: [CLAUDE.md](CLAUDE.md). Decisions: [ADR 0012](../docs/adr/0012-storefront-rendering-i18n-experiment.md)
(rendering, i18n, experiment) and [ADR 0013](../docs/adr/0013-storefront-architecture-and-design-system.md)
(architecture, RTK Query, design system).
Talks only to the gateway; API types come from `@zelqune/api-client`, brand tokens from
`@zelqune/ui-tokens`, copy from `../docs/copy-en.md` and `../docs/copy-bn.md`.

## Run locally
```bash
pnpm infra:up && pnpm seed          # backend stack + catalog (repo root)
cp frontend/.env.example frontend/.env.local   # optional; defaults work for local dev
pnpm --filter @zelqune/frontend dev  # http://localhost:3100
```
Try `http://localhost:3100/bn/products/alo-arch-panel?p=b` (price arm b, sticky for 90 days).

## Scripts
| Script | What |
|---|---|
| `dev` / `build` / `start` | Next.js on port 3100 (`build` needs `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, or `ALLOW_TEST_TURNSTILE=true` for CI/e2e) |
| `lint` / `typecheck` / `test` | ESLint, tsc, Vitest (copy vs docs, routing rules, formatting, badges) |
| `e2e` | Playwright checkout + RFQ paths against the running backend (builds and starts the site) |
| `screenshots` | Every page, mobile 390x844 + desktop 1440x900, en + bn, into `screenshots/` (gitignored) |
| `copy:check` | Lists `[[...]]` placeholders still to fill before launch |
| `gen:store` | Regenerates RTK Query endpoints from the gateway spec (after `pnpm gen:api`) |

## Env
See [.env.example](.env.example): `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`,
`MEDIA_BASE_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_META_PIXEL_ID` (empty = Pixel off).

## Structure
```
src/app/          routes (Server Components, ISR), metadata, sitemap
src/features/     catalog · cart · checkout · orders · quotes · analytics · landing · layout
src/shared/ui/    design system (logo, buttons, type, fields, sheet, accordion, images)
src/shared/lib/   pure helpers (routing, forms, json-ld, site, cookies), unit tested
src/shared/api/   server-side data and API error types
src/store/        Redux Toolkit store, RTK Query (generated + enhanced), slices, listeners
src/content/      sample imagery until real product photos exist (remove before launch)
```
