#!/bin/sh
# Runs once on an empty data volume. One schema + one login role per service; each role owns
# only its schema and cannot read any other service's tables.
set -eu

SCHEMAS="identity catalog inventory orders payments shipping notifications analytics"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
REVOKE ALL ON DATABASE "$POSTGRES_DB" FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
SQL

for schema in $SCHEMAS; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
    -v role="${schema}_svc" -v schema="$schema" -v password="$SERVICE_DB_PASSWORD" -v db="$POSTGRES_DB" <<'SQL'
CREATE ROLE :"role" LOGIN PASSWORD :'password';
GRANT CONNECT ON DATABASE :"db" TO :"role";
CREATE SCHEMA :"schema" AUTHORIZATION :"role";
ALTER ROLE :"role" SET search_path = :"schema";
SQL
  echo "created schema $schema owned by ${schema}_svc"
done
