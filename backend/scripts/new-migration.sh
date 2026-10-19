#!/bin/sh
# Creates a migration for one service by diffing its schema.prisma against the version
# committed at a git ref (default HEAD). No shadow database needed (see ADR 0003).
# Usage: sh scripts/new-migration.sh <service> <name> [git-ref]
set -eu
svc="${1:?service, e.g. catalog-service}"
name="${2:?migration name, e.g. add_products}"
ref="${3:-HEAD}"
cd "$(dirname "$0")/.."

schema="apps/$svc/prisma/schema.prisma"
old=$(mktemp)
trap 'rm -f "$old"' EXIT
git show "$ref:backend/$schema" >"$old"

# Migrations apply in folder-name order: always sort after the newest existing one.
stamp=$(date -u +%Y%m%d%H%M%S)
latest=$(ls "apps/$svc/prisma/migrations" | grep -E '^[0-9]{14}_' | sort | tail -1 | cut -c1-14)
if [ -n "$latest" ] && [ "$stamp" -le "$latest" ]; then
  stamp=$((latest + 1))
fi
dir="apps/$svc/prisma/migrations/${stamp}_$name"
mkdir -p "$dir"
pnpm exec prisma migrate diff --config "apps/$svc/prisma.config.ts" \
  --from-schema "$old" --to-schema "$schema" --script >"$dir/migration.sql"

if ! grep -q '[A-Za-z]' "$dir/migration.sql"; then
  rm -rf "$dir"
  echo "No schema changes for $svc" >&2
  exit 1
fi
echo "Created $dir/migration.sql"
