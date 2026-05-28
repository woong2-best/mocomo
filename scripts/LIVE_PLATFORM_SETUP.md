# MoCoMo 라이브 플랫폼 — 설정 가이드

## 아키텍처

- **방송:** OBS → SRS (RTMP) → HLS → 시청자 (`hls.js`)
- **채팅:** Socket.IO + DB
- **통화:** LiveKit (라이브와 분리)

자세한 SRS 배포: **`scripts/SRS_STREAMING_SETUP.md`**

## 1. Supabase SQL (필수)

`scripts/supabase-fix-all.sql`에서 **R, U, W** 등 라이브 관련 섹션 실행.

## 2. Vercel 환경 변수

| 변수 | 용도 |
|------|------|
| `SRS_RTMP_URL` | OBS RTMP 서버 (`rtmp://…/live`) |
| `NEXT_PUBLIC_SRS_HLS_BASE_URL` | HLS CDN (`https://cdn…/live`) |
| `SRS_WEBHOOK_SECRET` | (권장) SRS publish 훅 인증 |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO 서버 |
| `LIVEKIT_*` | 통화·DM만 |
| `STRIPE_*` | 방송 중 후원 |

## 3. Socket 서버

```bash
npm run dev:socket
```

## 4. SRS 서버

로컬: `docker compose -f docker-compose.srs.yml up -d`

프로덕션: VPS + Cloudflare (SRS_STREAMING_SETUP.md)

## 5. OBS

방송 스튜디오 **OBS** 탭 → 서버·방송 키 → OBS에 입력 → 방송 시작.

---

**다시보기(VOD)** 는 제공하지 않습니다.
