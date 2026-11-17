#!/bin/sh
# Nightly backup on the server: a compressed dump of the whole database plus the product photos,
# kept for KEEP_DAYS days in infra/backups/. Copy that folder off the server too (docs/deploy.md).
# Cron (as the deploy user): 30 3 * * * /srv/zelqune/infra/scripts/backup.sh >> /srv/zelqune/infra/backups/backup.log 2>&1
set -eu
cd "$(dirname "$0")/.."
KEEP_DAYS="${KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"
mkdir -p backups

$COMPOSE exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  > "backups/db-$STAMP.dump"
$COMPOSE exec -T catalog-service tar -C /app/storage -czf - . > "backups/media-$STAMP.tgz"

# A dump smaller than 1 KB means something went wrong: keep the old ones and fail loudly.
if [ "$(wc -c < "backups/db-$STAMP.dump")" -lt 1024 ]; then
  echo "backup FAILED: db-$STAMP.dump is too small" >&2
  exit 1
fi
find backups -name 'db-*.dump' -mtime +"$KEEP_DAYS" -delete
find backups -name 'media-*.tgz' -mtime +"$KEEP_DAYS" -delete
echo "backup ok: db-$STAMP.dump, media-$STAMP.tgz"
