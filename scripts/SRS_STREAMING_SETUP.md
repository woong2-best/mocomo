# MoCoMo 실시간 방송 — SRS RTMP → HLS

트위치/치지직과 같은 구조입니다. **VOD·다시보기 없음.**

```
[스트리머 OBS] → RTMP → [SRS] → HLS → [시청자 hls.js]
                      ↘ http_hooks → MoCoMo /api/live/srs-webhook
```

## 1. 로컬 개발

```bash
# SRS 띄우기
docker compose -f docker-compose.srs.yml up -d

# .env.local
SRS_RTMP_URL=rtmp://127.0.0.1:1935/live
NEXT_PUBLIC_SRS_HLS_BASE_URL=http://127.0.0.1:8080/live
SRS_WEBHOOK_SECRET=dev-srs-secret

# Next + Socket
npm run dev
```

`docker/srs/srs.conf`의 `http_hooks` URL이 `host.docker.internal:3000`이면 로컬 Next와 연동됩니다.

## 2. 프로덕션 (Ubuntu VPS + Cloudflare)

### SRS 설치 (Docker 권장)

```bash
git clone <mocomo-repo>
cd mocomo
# srs.conf http_hooks → https://mocomo.net/api/live/srs-webhook
docker compose -f docker-compose.srs.yml up -d
```

방화벽: **1935/TCP** (RTMP), **8080/TCP** (HLS, CDN 뒤에 둘 경우 제한 가능).

### Cloudflare CDN

1. `stream.mocomo.net` → VPS IP (DNS only 또는 proxied)
2. HLS: `cdn.mocomo.net` → SRS `:8080` 또는 Nginx 리버스 프록시
3. MoCoMo Vercel 환경 변수:

| 변수 | 예시 |
|------|------|
| `SRS_RTMP_URL` | `rtmp://stream.mocomo.net/live` |
| `NEXT_PUBLIC_SRS_HLS_BASE_URL` | `https://cdn.mocomo.net/live` |
| `SRS_WEBHOOK_SECRET` | 긴 랜덤 문자열 (SRS 훅 요청 시 `X-SRS-Secret` 헤더) |

4. **Redeploy** Vercel 후 `https://mocomo.net/api/health/obs` 확인

### OBS 설정

| OBS 항목 | 값 |
|----------|-----|
| 서버 | MoCoMo 스튜디오 OBS 탭 `obsServer` |
| 방송 키 | `obsStreamKey` |

## 3. Supabase

`scripts/supabase-fix-all.sql` **U) OBS** 섹션 실행 (`rtmpUrl`, `rtmpStreamKey` 등).

## 4. 채팅

변경 없음 — **Socket.IO** (`npm run dev:socket`, `NEXT_PUBLIC_SOCKET_URL`).

## 5. LiveKit

**음성 통화·DM**만 LiveKit 사용. 라이브 방송 재생/송출은 SRS+HLS만 사용합니다.

## 6. 점검

- `GET /api/health/obs` → `engine: "srs", configured: true`
- 방송 생성 → 스튜디오 OBS 키 → OBS 송출 → 시청 페이지 HLS 재생
