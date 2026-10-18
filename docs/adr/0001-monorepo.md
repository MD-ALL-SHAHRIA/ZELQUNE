# 0001. Single monorepo with pnpm workspaces and Turborepo

- Status: Accepted
- Date: 2026-10-19

## Context
The platform has a backend (9 NestJS apps), a storefront and an admin dashboard. The frontends
must use API types generated from the gateway's OpenAPI spec, and brand tokens must be shared.
One person builds it, with reviews through pull requests.

## Decision
One Git repository. pnpm workspaces for `backend/`, `frontend/`, `dashboard/` and `packages/*`
(`api-client`, `ui-tokens`); Turborepo runs `lint`, `typecheck`, `test` and `build` across them
with caching. The backend itself stays a Nest monorepo (apps + libs) inside one workspace package.
Infrastructure lives in `infra/`. CI has one workflow per area, filtered by changed paths.

## Consequences
- One PR can change an API and its consumers together; generated types never drift silently.
- One lockfile and one Dependabot configuration.
- CI must stay path-aware so a frontend change does not run backend tests.
- Deploy targets stay separate (VPS for backend, Vercel for frontends) despite one repo.
