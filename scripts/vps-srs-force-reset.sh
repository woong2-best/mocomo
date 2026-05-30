#!/bin/bash
# Vultr 콘솔 — 깜빡임/붙여넣기 안 될 때: 짧은 한 줄로 실행
# curl -fsSL https://raw.githubusercontent.com/woong2-best/mocomo/main/scripts/vps-srs-force-reset.sh | bash
set +e

echo "==> 1) 돌아가는 SRS/설치 스크립트 정리"
pkill -9 -f "vps-srs" 2>/dev/null
pkill -9 -f "docker compose" 2>/dev/null
sleep 1

DIR="${HOME}/mocomo"
REPO="https://github.com/woong2-best/mocomo.git"

if [ ! -d "$DIR/.git" ]; then
  echo "==> clone"
  git clone "$REPO" "$DIR" || exit 1
fi

cd "$DIR" || exit 1
git pull origin main 2>/dev/null || true

echo "==> 2) SRS 컨테이너 강제 재시작"
docker compose -f docker-compose.srs.yml down 2>/dev/null
docker stop mocomo-srs 2>/dev/null
docker rm -f mocomo-srs 2>/dev/null
docker compose -f docker-compose.srs.yml up -d --force-recreate

sleep 3
docker exec mocomo-srs sh -c 'mkdir -p ./objs/nginx/html/live' 2>/dev/null

echo "==> 3) 상태"
docker ps | head -5
curl -sf http://127.0.0.1:1985/api/v1/versions/ | head -c 80 || echo "api skip"
echo ""
echo "DONE ok"
