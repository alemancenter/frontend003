#!/usr/bin/env bash
# Run ON THE SERVER (as root or the domain user via `sudo`) from the extracted
# release folder. Idempotent — safe to re-run for every update.
#
#   tar -xzf alemancenter-web-release.tar.gz -C /tmp/alemancenter-release
#   cd /tmp/alemancenter-release && bash server-deploy.sh
#
set -euo pipefail

VHOST="/var/www/vhosts/alemancenter.com"
DOCROOT="$VHOST/httpdocs"
APIDIR="$VHOST/api-server"
SRC="$(cd "$(dirname "$0")" && pwd)"

echo "▶ 1/5  Deploying static SPA → $DOCROOT"
# Preserve the domain user's ownership; replace web content atomically-ish.
mkdir -p "$DOCROOT"
# Keep a one-shot backup of the previous site.
if [ -f "$DOCROOT/index.html" ]; then
  rsync -a --delete --exclude='.well-known' "$DOCROOT/" "$VHOST/httpdocs.bak/" || true
fi
rsync -a --delete --exclude='.well-known' "$SRC/httpdocs/" "$DOCROOT/"

echo "▶ 2/5  Deploying api-server bundle → $APIDIR"
mkdir -p "$APIDIR"
rsync -a --delete --exclude='.env' --exclude='node_modules' "$SRC/api-server/" "$APIDIR/"
[ -f "$APIDIR/.env" ] || cp "$APIDIR/.env.example" "$APIDIR/.env"
chmod 600 "$APIDIR/.env"

echo "▶ 3/5  Installing native deps (sharp) for this server…"
( cd "$APIDIR" && npm install --omit=dev --no-audit --no-fund )

echo "▶ 4/5  Fixing ownership to the Plesk domain user"
OWNER="$(stat -c '%U:%G' "$VHOST")"
chown -R "$OWNER" "$DOCROOT" "$APIDIR"

echo "▶ 5/5  Restarting the Node service"
systemctl restart alemancenter-web-api
sleep 1
systemctl --no-pager status alemancenter-web-api | head -n 6

echo "✓ Deploy complete. Verify:  curl -I https://alemancenter.com/  &&  curl -s https://alemancenter.com/api/health"
