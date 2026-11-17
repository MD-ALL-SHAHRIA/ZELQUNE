# Code quality audit (2026-11-18)

Scope: backend, frontend, dashboard, packages (about 74k lines of TypeScript). Checked with
`tsc`, ESLint, Prettier, `pnpm audit` and repo scripts for unused exports/files, duplicate
blocks, naming, import boundaries and hardcoded secrets.

| Area | Result |
|---|---|
| Syntax / TypeScript errors | None. `strict` on in every package. |
| Unused variables / imports | None; `no-unused-vars` is an error in all ESLint configs. Two stale `eslint-disable` lines removed. |
| Dead code | Removed 8 unused components, 1 unused hook, 2 unused test doubles, 2 unused files. |
| Duplicate code | Request-code panel (construction and design forms) → `QuoteSubmitted`; WhatsApp link → `ChatLink`; dashboard site/API URL fallback (11 copies) → `lib/env.ts`; storefront server API URL (2 copies) → `SERVER_API_URL`. |
| Dependencies | All used (`ts-loader` and `reflect-metadata` are needed by Nest). `pnpm audit`: Next.js fixed in #108; low/moderate `fast-uri` and `js-yaml` remain (dev tooling only). |
| Error handling | Backend: `AppError` for client errors, plain `Error` only for startup/programmer faults. Dashboard API turns network failures into a 503 message. Silent `.catch` only on best-effort work (cache writes, clipboard, video play, font load). |
| Naming | Files and folders kebab-case, components PascalCase, no snake_case identifiers. |
| Structure | `shared/` never imports `features/`; no backend service imports another (contracts only); libs never import apps. |
| Hardcoded secrets | None. Only local dev defaults (`zelqune_dev`) in docker-compose and `.env.example`; real keys come from `pnpm keys:dev`. |

Open (not blocking):
- `dashboard/src/app/(admin)/content/page.tsx` (982 lines) should be split into per-section components.
- About 280 exports are used only inside their own file; harmless, can be un-exported over time.
- The dashboard build does not fail when `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_SITE_URL` are unset (falls back to localhost); set both in the deploy config.
