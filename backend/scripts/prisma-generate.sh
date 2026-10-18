#!/bin/sh
# Generates each service's Prisma client into apps/<service>/src/generated/prisma.
set -e
[ "${SKIP_PRISMA_GENERATE:-}" = "1" ] && exit 0
. "$(dirname "$0")/apps.sh"
for svc in $SERVICES; do
  pnpm exec prisma generate --config "apps/$svc/prisma.config.ts" >/dev/null
  echo "prisma client generated: $svc"
done
