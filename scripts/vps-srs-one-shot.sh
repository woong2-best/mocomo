#!/bin/bash
# MoCoMo VPS — SRS 방송 서버 한 번에 설정 (Vultr 콘솔에 붙여넣기 1줄용)
set -euo pipefail

APP_URL="${APP_URL:-https://mocomo.net}"
REPO="https://github.com/woong2-best/mocomo.git"
DIR="${HOME}/mocomo"

echo "==> MoCoMo SRS 설정 시작"

if [ ! -d "$DIR/.git" ]; then
  echo "==> 저장소 clone"
  git clone "$REPO" "$DIR"
fi

cd "$DIR"
git pull origin main

HOOK_URL="${APP_URL%/}/api/live/srs-webhook"
if grep -q 'host.docker.internal' docker/srs/srs.conf 2>/dev/null; then
  sed -i "s|http://host.docker.internal:3000/api/live/srs-webhook|${HOOK_URL}|g" docker/srs/srs.conf
  echo "==> 웹훅 URL: $HOOK_URL"
fi

echo "==> SRS 컨테이너 재시작"
docker compose -f docker-compose.srs.yml pull
docker compose -f docker-compose.srs.yml up -d --force-recreate

echo ""
echo "==> 실행 중인 컨테이너"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -10

echo ""
echo "==> 웹훅 확인"
grep srs-webhook docker/srs/srs.conf || true

echo ""
echo "==> SRS API"
curl -sf http://127.0.0.1:1985/api/v1/versions/ | head -c 200 || echo "(1985 응답 없음 — 방송은 RTMP만으로도 가능)"

echo ""
echo "완료. 이제 mocomo.net 에서 OBS 방송 시작하세요."
