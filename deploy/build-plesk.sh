#!/usr/bin/env bash
# Run LOCALLY (from artifacts/deploy). Builds the SPA + Node server and assembles
# a ready-to-upload /httpdocs folder that matches the Plesk Node.js app layout:
#
#   httpdocs/
#   ├── server.js       ← Plesk "Application Startup File"
#   ├── dist/           ← bundled server (index.mjs + workers)
#   ├── package.json    ← runtime deps (sharp)
#   └── public/         ← the SPA  (Plesk "Document Root" = /httpdocs/public)
#
# Usage:  cd artifacts/deploy && bash build-plesk.sh
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"          # artifacts/
WEB="$ROOT/alemancenter-web"
API="$ROOT/api-server"
OUT="$HERE/release/httpdocs"

echo "▶ Building SPA…"
# MSYS_NO_PATHCONV=1 stops Git Bash (Windows) from rewriting BASE_PATH="/" into a
# Windows path like "/Program Files/Git/" — which would break every asset URL.
( cd "$WEB" && pnpm install --frozen-lockfile && MSYS_NO_PATHCONV=1 BASE_PATH=/ PORT=3000 pnpm build )

echo "▶ Building Node server…"
( cd "$API" && pnpm install --frozen-lockfile && pnpm build )

echo "▶ Assembling httpdocs/ …"
rm -rf "$HERE/release"
mkdir -p "$OUT/public" "$OUT/dist"
cp -r "$WEB/dist/public/." "$OUT/public/"          # SPA  → public/
cp -r "$API/dist/." "$OUT/dist/"                    # bundle → dist/
cp "$HERE/server.js"           "$OUT/server.js"     # Plesk startup file
cp "$HERE/server-package.json" "$OUT/package.json"  # runtime deps (sharp)

echo "▶ Creating tarball…"
tar -C "$HERE/release" -czf "$HERE/httpdocs.tar.gz" httpdocs
echo "✓ Done."
echo "  Folder:  $OUT"
echo "  Tarball: $HERE/httpdocs.tar.gz   (upload & extract into /var/www/vhosts/alemancenter.com/httpdocs)"
