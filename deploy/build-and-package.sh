#!/usr/bin/env bash
# Run LOCALLY (from artifacts/deploy). Builds the frontend + api-server and
# produces alemancenter-web-release.tar.gz ready to upload to the server.
#
#   cd artifacts/deploy && bash build-and-package.sh
#
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"          # artifacts/
WEB="$ROOT/alemancenter-web"
API="$ROOT/api-server"
OUT="$HERE/release"

echo "▶ Building frontend (static SPA)…"
( cd "$WEB" && BASE_PATH=/ PORT=3000 pnpm install --frozen-lockfile && BASE_PATH=/ PORT=3000 pnpm build )

echo "▶ Building api-server (Node bundle)…"
( cd "$API" && pnpm install --frozen-lockfile && pnpm build )

echo "▶ Assembling release/ …"
rm -rf "$OUT"
mkdir -p "$OUT/httpdocs" "$OUT/api-server"

# 1) Static SPA → httpdocs
cp -r "$WEB/dist/public/." "$OUT/httpdocs/"
cp "$HERE/httpdocs.htaccess" "$OUT/httpdocs/.htaccess"

# 2) api-server bundle + the minimal server package.json (sharp only)
cp -r "$API/dist" "$OUT/api-server/dist"
cp "$HERE/server-package.json" "$OUT/api-server/package.json"
cp "$HERE/api-server.env.example" "$OUT/api-server/.env.example"

# 3) ops files
cp "$HERE/alemancenter-web-api.service" "$OUT/"
cp "$HERE/nginx-directives.conf" "$OUT/"
cp "$HERE/server-deploy.sh" "$OUT/"

echo "▶ Creating tarball…"
tar -C "$OUT" -czf "$HERE/alemancenter-web-release.tar.gz" .
echo "✓ Done: $HERE/alemancenter-web-release.tar.gz"
echo "  Upload it to the server and run server-deploy.sh (see README-DEPLOY.md)."
