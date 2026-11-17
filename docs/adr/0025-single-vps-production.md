# 0025. Production on one VPS with Docker Compose and Caddy

Date: 2026-11-18 · Status: accepted

## Context
Launch traffic is small and the owner runs the business alone. The 9 backend apps, Postgres,
RabbitMQ and Redis already run together in the dev compose. A managed platform or Kubernetes
would cost money and need operations knowledge the owner does not have.

## Decision
- One VPS (Contabo, Ubuntu 24.04) runs `infra/docker-compose.prod.yml`.
- Caddy is the only public entry (80/443): automatic Let's Encrypt HTTPS, HSTS, gzip/zstd,
  `zelqune.com` (storefront), `admin.` (dashboard), `api.` (gateway), `media.` (photos when
  `STORAGE_DRIVER=local`). No other container publishes a port; the firewall allows 22/80/443.
- No dev defaults: every secret is required (`${VAR:?}`) and generated on the server
  (`dev-keys.mjs --prod`). Redis gets a password; Swagger is off (`API_DOCS=false`).
- Images are tagged with `RELEASE` (the git commit) so a rollback is `RELEASE=<old> up -d`.
- Nightly `pg_dump` + photo archive, 14 days on the server; the owner copies them off-site.
- Logs: JSON to stdout, Docker `json-file` rotation (5 × 20 MB per container).

## Consequences
- One machine is a single point of failure; recovery is restore-from-backup (minutes to an hour).
- Updates restart containers one by one: a few seconds of downtime, no blue/green.
- Moving to R2 for photos, an external uptime monitor or Sentry needs the owner's sign-up.
