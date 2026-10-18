#!/bin/sh
# Builds every app with the Nest CLI (webpack) into dist/apps/<app>/main.js.
set -e
. "$(dirname "$0")/apps.sh"
for app in $APPS; do
  echo "building $app"
  pnpm exec nest build "$app"
done
