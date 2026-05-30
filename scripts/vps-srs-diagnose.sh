#!/bin/bash
# Vultr noVNC/SSH — SRS HLS·FLV 진단 (결과 전체 복사해서 공유)
set +e
echo "========== docker ps =========="
docker ps -a --filter name=mocomo-srs
echo ""
echo "========== SRS logs (last 80) =========="
docker logs --tail 80 mocomo-srs 2>&1
echo ""
echo "========== SRS API streams =========="
curl -sf --max-time 5 "http://127.0.0.1:1985/api/v1/streams/?count=10" | head -c 2000
echo ""
echo ""
echo "========== HLS dir in container =========="
docker exec mocomo-srs sh -c 'ls -la ./objs/nginx/html/live 2>/dev/null; ls ./objs/nginx/html/live/*.m3u8 2>/dev/null | head -5; ls ./objs/nginx/html/live/*.ts 2>/dev/null | head -5' 2>&1
echo ""
echo "========== HTTP 8080 /live =========="
curl -sI --max-time 5 "http://127.0.0.1:8080/live/" | head -5
echo ""
echo "========== sample m3u8 (first key found) =========="
KEY=$(docker exec mocomo-srs sh -c 'ls ./objs/nginx/html/live/*.m3u8 2>/dev/null | head -1' 2>/dev/null | xargs basename 2>/dev/null)
if [ -n "$KEY" ]; then
  echo "file: $KEY"
  docker exec mocomo-srs sh -c "head -20 ./objs/nginx/html/live/$KEY" 2>/dev/null
  FLV="${KEY%.m3u8}.flv"
  curl -sI --max-time 5 "http://127.0.0.1:8080/live/$FLV" | head -3
else
  echo "(no .m3u8 — HLS not generated yet or wrong stream name)"
fi
echo ""
echo "DONE diagnose"
