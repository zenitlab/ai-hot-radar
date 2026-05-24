#!/usr/bin/env bash
#
# AI Hot Radar - one-click update on the server.
# Usage:
#   ./update.sh            # rebuild whatever changed (default)
#   ./update.sh frontend   # rebuild only frontend
#   ./update.sh backend    # rebuild only backend
#   ./update.sh nocache    # full rebuild without docker layer cache
#
set -euo pipefail

cd "$(dirname "$0")"

TARGET="${1:-all}"

echo "==> Backing up SQLite database"
if [ -f ./data/dev.db ]; then
  mkdir -p ./data/backups
  cp ./data/dev.db "./data/backups/dev.db.$(date +%Y%m%d-%H%M%S)"
  # keep only the last 10 backups
  ls -1t ./data/backups/dev.db.* 2>/dev/null | tail -n +11 | xargs -r rm -f
fi

echo "==> Pulling latest code"
git pull --ff-only

case "$TARGET" in
  frontend)
    echo "==> Rebuilding frontend only"
    docker compose up -d --build frontend
    ;;
  backend)
    echo "==> Rebuilding backend only"
    docker compose up -d --build backend
    ;;
  nocache)
    echo "==> Full rebuild without cache"
    docker compose build --no-cache
    docker compose up -d
    ;;
  all|*)
    echo "==> Rebuilding all changed services"
    docker compose up -d --build
    ;;
esac

echo "==> Pruning dangling images"
docker image prune -f >/dev/null

echo "==> Status"
docker compose ps
echo "==> Done."
