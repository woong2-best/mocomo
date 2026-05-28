#!/bin/bash
# Ubuntu VPS — MoCoMo SRS (RTMP 1935, HLS 8080)
# 사용: APP_URL=https://mocomo.net bash install-srs-vps.sh
set -euo pipefail

APP_URL="${APP_URL:-https://mocomo.net}"
REPO_DIR="${REPO_DIR:-$HOME/mocomo}"

if ! command -v docker &>/dev/null; then
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker "$USER" || true
fi

mkdir -p "$REPO_DIR"
if [ ! -f "$REPO_DIR/docker-compose.srs.yml" ]; then
  echo "→ git clone mocomo into $REPO_DIR"
  git clone https://github.com/woong2-best/mocomo.git "$REPO_DIR"
fi
cd "$REPO_DIR"
git pull origin main

HOOK_URL="${APP_URL%/}/api/live/srs-webhook"
sed -i "s|http://host.docker.internal:3000/api/live/srs-webhook|${HOOK_URL}|g" docker/srs/srs.conf

docker compose -f docker-compose.srs.yml pull
docker compose -f docker-compose.srs.yml up -d

echo ""
echo "SRS 실행 완료"
echo "  RTMP: rtmp://$(curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}'):1935/live"
echo "  HLS:  http://$(curl -s ifconfig.me 2>/dev/null || echo YOUR_IP):8080/live/{stream}.m3u8"
echo "  Webhook: ${HOOK_URL}"
echo ""
echo "Vercel 환경 변수:"
echo "  SRS_RTMP_URL=rtmp://YOUR_DOMAIN_OR_IP:1935/live"
echo "  NEXT_PUBLIC_SRS_HLS_BASE_URL=https://cdn.YOUR_DOMAIN/live  (또는 http://IP:8080/live)"
