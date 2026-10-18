#!/bin/sh
# Applies the app's Prisma migrations (services only), then starts it.
set -e
: "${APP:?APP must be set (gateway, identity-service, ...)}"

if [ -f "apps/$APP/prisma.config.ts" ]; then
  echo "[$APP] applying migrations"
  # Each service migrates only its own schema, so the DB-wide advisory lock is unnecessary
  # and would only serialise the 8 services at startup.
  PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK=1 node_modules/.bin/prisma migrate deploy --config "apps/$APP/prisma.config.ts"
fi

exec node "dist/apps/$APP/main.js"
