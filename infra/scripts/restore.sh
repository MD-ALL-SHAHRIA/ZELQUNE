#!/bin/sh
# Restores a database dump made by backup.sh (replaces current data). Usage:
#   infra/scripts/restore.sh infra/backups/db-20261118-033000.dump
# Every app is stopped first so nothing reads or writes during the restore, then started again.
set -eu
DUMP="$(cd "$(dirname "${1:?usage: restore.sh <db-*.dump>}")" && pwd)/$(basename "$1")"
cd "$(dirname "$0")/.."
COMPOSE="docker compose -f docker-compose.prod.yml --env-file .env.production"
APPS="$($COMPOSE config --services | grep -vxE 'postgres|rabbitmq|redis')"
# shellcheck disable=SC2086
$COMPOSE stop $APPS
$COMPOSE exec -T postgres \
  sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < "$DUMP"
$COMPOSE up -d
echo "restored $DUMP"
