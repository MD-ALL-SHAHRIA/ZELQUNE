# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
uses [Semantic Versioning](https://semver.org/) once it ships.

## [Unreleased]

### Added
- Step 1.1: identity-service with E.164 phone users (+8801…, Bangla digits accepted), roles
  OWNER/STAFF/CUSTOMER, argon2id admin passwords, ES256 access tokens and rotating refresh
  tokens with reuse detection (ADR 0006).
- Gateway admin auth: `POST /v1/admin/auth/login|refresh|logout`, `GET /v1/admin/auth/me`;
  refresh token in an `HttpOnly; Secure; SameSite=Strict` cookie; default-deny JWT guard and
  role guard; per-IP rate limits in Redis and a per-phone lock that counts failed logins only.
- catalog-service: category tree, bilingual products with sale modes and SEO, variants, media,
  price history and price experiments (`?p=a|b`); media via `StorageProvider` (R2 presigned PUT,
  local fake) (ADR 0007); admin use-cases over TCP (HTTP routes in step 1.3).
- Public catalog API: `GET /v1/catalog/categories`, `/v1/catalog/products`,
  `/v1/catalog/products/{slug}`; only ACTIVE products, active variants and READY media.
- Events `product.published`, `product.updated`, `price.changed` through the outbox.
- `pnpm keys:dev`, idempotent `pnpm seed` (OWNER admin + Alo-Arch Panel pre-order catalog),
  `backend/scripts/new-migration.sh`, gateway end-to-end suite on real infrastructure in CI.

### Fixed
- Service errors sent over TCP reached the gateway as 503: the exception filter was not applied
  to the hybrid microservice transport (present since step 1.0).
- Monorepo with pnpm workspaces and Turborepo: `backend/`, `frontend/`, `dashboard/`,
  `packages/api-client`, `packages/ui-tokens`, `infra/`, `docs/`.
- Backend skeleton (build plan step 1.0): NestJS gateway (REST `/v1`, Swagger `/docs`, aggregated
  `/health`) and 8 private services over TCP, each with its own Prisma schema and migrations.
- `libs/common`: typed env config, pino logging with `x-request-id`, global error filter, health
  module, `Idempotency-Key` interceptor, transactional outbox and RabbitMQ publisher/consumer with
  processed-event tracking. `libs/contracts`: versioned event envelope and RPC contracts.
- Dev docker-compose: Postgres (one schema and role per service), RabbitMQ, Redis, all apps.
- CI workflows per area, PR and issue templates, CODEOWNERS, Dependabot.
- Architecture overview and ADRs 0001–0005.
