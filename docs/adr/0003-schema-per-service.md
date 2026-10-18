# 0003. One Postgres schema and one database role per service

- Status: Accepted
- Date: 2026-10-19

## Context
"Each service owns its data" must hold, but separate Postgres servers are too expensive for a
single VPS. Convention alone ("don't query other tables") erodes over time.

## Decision
One Postgres server and database (`zelqune`) with one schema per service (`identity`, `catalog`,
`inventory`, `orders`, `payments`, `shipping`, `notifications`, `analytics`). Each service connects
as its own role (`<schema>_svc`) that owns only its schema, has `search_path` set to it, and has
no `CREATE` on the database. `infra/postgres/init` creates schemas and roles; Prisma migrations
create only tables (they deliberately omit `CREATE SCHEMA`).

## Consequences
- Cross-service reads fail with `permission denied`, so the boundary is enforced by the DB.
- A service can later move to its own server by changing `DATABASE_URL`.
- `prisma migrate dev` needs a shadow database URL with broader rights; generate migrations with
  `prisma migrate diff` or a dedicated dev shadow DB (documented in backend/README.md).
