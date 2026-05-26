#!/usr/bin/env bash
#
# AI Hot Radar - 本地一键发版脚本 (run on your Mac)
#
# 流程: 本地 build → push 到 Docker Hub → (可选) SSH 到服务器拉新镜像
#
# 用法:
#   ./release.sh                # 构建并推送 backend + frontend
#   ./release.sh backend        # 只推后端
#   ./release.sh frontend       # 只推前端
#   ./release.sh nocache        # 全量无缓存重建
#
# 可选环境变量 (设了就自动 SSH 部署, 不设就只 push):
#   SERVER_HOST=user@1.2.3.4    # SSH 目标
#   SERVER_PATH=/www/dk_project/ai_hot_radar   # 服务器项目目录
#
# 示例:
#   SERVER_HOST=root@aihotradar.com ./release.sh
#
set -euo pipefail

cd "$(dirname "$0")"

# ---------- 配置 ----------
BACKEND_IMAGE="zenitlab/ai-hot-radar-backend:latest"
FRONTEND_IMAGE="zenitlab/ai-hot-radar-frontend:latest"
PLATFORM="linux/amd64"           # 服务器是 x86 Linux
DEFAULT_SERVER_PATH="/www/dk_project/ai_hot_radar"

TARGET="${1:-all}"
SERVER_HOST="${SERVER_HOST:-}"
SERVER_PATH="${SERVER_PATH:-$DEFAULT_SERVER_PATH}"

# ---------- 颜色 ----------
if [ -t 1 ]; then
  C_GREEN='\033[0;32m'; C_YELLOW='\033[1;33m'; C_RED='\033[0;31m'
  C_BLUE='\033[0;34m'; C_RESET='\033[0m'
else
  C_GREEN=''; C_YELLOW=''; C_RED=''; C_BLUE=''; C_RESET=''
fi
say()  { printf "${C_BLUE}==>${C_RESET} %s\n" "$*"; }
ok()   { printf "${C_GREEN}✔${C_RESET}  %s\n" "$*"; }
warn() { printf "${C_YELLOW}!${C_RESET}  %s\n" "$*"; }
die()  { printf "${C_RED}✘ %s${C_RESET}\n" "$*" >&2; exit 1; }

# ---------- 前置检查 ----------
command -v docker >/dev/null || die "未找到 docker"
docker buildx version >/dev/null 2>&1 || die "未启用 docker buildx (Docker Desktop 默认带)"

# 确认已登录 Docker Hub
if ! docker info 2>/dev/null | grep -q "Username:"; then
  warn "你似乎还没 docker login. 现在跑一次?"
  read -r -p "回车继续登录, Ctrl-C 取消: " _ && docker login
fi

# 确认 buildx 默认 builder 可用
docker buildx inspect --bootstrap >/dev/null 2>&1 || {
  say "创建并启用 buildx builder"
  docker buildx create --use --name radar-builder >/dev/null
}

# ---------- 构建并推送 ----------
NO_CACHE_FLAG=""
if [ "$TARGET" = "nocache" ]; then
  NO_CACHE_FLAG="--no-cache"
  TARGET="all"
  warn "全量无缓存重建模式"
fi

build_push() {
  local svc=$1 dir=$2 image=$3
  say "构建并推送 $svc → $image"
  docker buildx build \
    --platform "$PLATFORM" \
    $NO_CACHE_FLAG \
    -t "$image" \
    --push \
    "./$dir"
  ok "$svc 推送完成"
}

case "$TARGET" in
  backend)
    build_push backend server "$BACKEND_IMAGE"
    UPDATED="backend"
    ;;
  frontend)
    build_push frontend client "$FRONTEND_IMAGE"
    UPDATED="frontend"
    ;;
  all|*)
    build_push backend server "$BACKEND_IMAGE"
    build_push frontend client "$FRONTEND_IMAGE"
    UPDATED=""
    ;;
esac

ok "所有镜像已推送到 Docker Hub"

# ---------- 服务器侧部署 ----------
SERVER_CMD="cd $SERVER_PATH && docker compose pull ${UPDATED} && docker compose up -d ${UPDATED} && docker image prune -f"

if [ -n "$SERVER_HOST" ]; then
  say "SSH 到 $SERVER_HOST 自动部署"
  # shellcheck disable=SC2029
  ssh "$SERVER_HOST" "$SERVER_CMD"
  ok "服务器已更新"
  say "验证: curl -sI https://aihotradar.com/api/agent/stats"
else
  echo
  warn "未设置 SERVER_HOST, 请手动到服务器执行:"
  printf "${C_GREEN}  %s${C_RESET}\n" "$SERVER_CMD"
  echo
  say "下次想自动部署:  SERVER_HOST=root@你的IP ./release.sh"
fi
