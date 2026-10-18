#!/bin/sh
# Curls every /health exposed on localhost by docker-compose (dev only).
. "$(dirname "$0")/apps.sh"
tmp=$(mktemp)
status=0
port=3000
for app in $APPS; do
  code=$(curl -s -o "$tmp" -w '%{http_code}' "http://127.0.0.1:$port/health")
  printf '%-22s :%s  HTTP %s  %s\n' "$app" "$port" "$code" "$(cat "$tmp" 2>/dev/null)"
  [ "$code" = "200" ] || status=1
  port=$((port + 1))
done
rm -f "$tmp"
exit $status
