# MoCoMo 라이브 플랫폼 — 직접 설정 가이드

코드는 배포되어 있지만, 아래를 **직접** 해야 자동 다시보기·AI 채팅·실시간 채팅이 동작합니다.

## 1. Supabase SQL (필수)

`scripts/supabase-fix-all.sql`에서 **R, S, T** 섹션을 SQL Editor에서 실행하세요.

## 2. Vercel 환경 변수

| 변수 | 용도 |
|------|------|
| `LIVEKIT_URL` / `NEXT_PUBLIC_LIVEKIT_URL` | `wss://xxx.livekit.cloud` |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | LiveKit Cloud |
| `LIVEKIT_EGRESS_ENABLED` | `1` 이면 방송 종료 시 R2 자동 녹화 |
| `S3_ENDPOINT` | R2: `https://<account>.r2.cloudflarestorage.com` |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | R2 API 토큰 |
| `S3_BUCKET_NAME` | 버킷 이름 |
| `S3_PUBLIC_URL` | `https://cdn.mocomo.net` 등 공개 URL |
| `S3_REGION` | `auto` |
| `OPENAI_API_KEY` | (선택) 채팅 AI 검열 |
| `NEXT_PUBLIC_SOCKET_URL` | Socket 서버 URL |
| `STRIPE_*` | 방송 중 후원 |

## 3. LiveKit Webhook (자동 다시보기)

1. [LiveKit Cloud](https://cloud.livekit.io) → 프로젝트 → **Webhooks**
2. URL: `https://mocomo.net/api/livekit/webhook`
3. 이벤트: `egress_ended` (권장: room_finished 포함)
4. API Key / Secret은 Vercel과 동일

방송 종료 후 몇 분 뒤 `VoiceChannel.vodUrl`에 MP4 링크가 들어갑니다.

## 4. LiveKit Egress + R2

- LiveKit Cloud 요금제에서 **Egress** 사용 가능한지 확인
- R2 버킷 CORS·공개 읽기(또는 CDN) 설정
- `LIVEKIT_EGRESS_ENABLED=1` 설정 후 테스트 방송 → 종료 → `/voice/[id]` 다시보기

## 5. Socket 서버 (실시간 채팅)

Vercel만으로는 Socket이 안 뜹니다.

```bash
npm run dev:socket   # 로컬
# 프로덕션: Railway 등에 server/socket.ts 배포
```

`NEXT_PUBLIC_SOCKET_URL`을 그 서버 주소로 설정하세요.

## 6. OBS Studio (RTMP Ingress)

- LiveKit Cloud에서 **Ingress** 사용 가능한지 확인
- 방송 시작 시 **OBS** 탭 → 서버 URL + 스트림 키 복사
- OBS: 설정 → 방송 → 사용자 지정 → 붙여넣기 → 방송 시작
- **동시 방송**: 스트리머마다 별도 방(`VoiceChannel`)·별도 RTMP 키 → 서로 간섭 없음

## 7. OpenAI (선택)

`OPENAI_API_KEY` 없으면 기본 금칙어·스팸 필터만 동작합니다.

---

문제 시: Vercel 로그 `[startChannelEgress]`, `[livekit/webhook]` 검색.
