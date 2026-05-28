# MoCoMo 라이브 플랫폼 — 직접 설정 가이드

## 1. Supabase SQL (필수)

`scripts/supabase-fix-all.sql`에서 **R, S, T, U** 섹션을 SQL Editor에서 실행하세요.

## 2. Vercel 환경 변수

| 변수 | 용도 |
|------|------|
| `LIVEKIT_URL` / `NEXT_PUBLIC_LIVEKIT_URL` | `wss://xxx.livekit.cloud` |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | LiveKit Cloud |
| `S3_*` | 클립·이미지 업로드 (R2, 다시보기와 무관) |
| `OPENAI_API_KEY` | (선택) 채팅 AI 검열 |
| `NEXT_PUBLIC_SOCKET_URL` | Socket 서버 URL |
| `STRIPE_*` | 방송 중 후원 |

## 3. Socket 서버 (실시간 채팅)

```bash
npm run dev:socket
```

프로덕션: Railway 등에 `server/socket.ts` 배포 후 `NEXT_PUBLIC_SOCKET_URL` 설정.

## 4. OBS Studio (RTMP Ingress)

- LiveKit **Ingress** 플랜 확인
- 방송 스튜디오 **OBS** 탭 → RTMP 서버·스트림 키 → OBS 사용자 지정
- 스트리머 여러 명 **동시 방송** 가능 (방마다 별도 키)

## 5. OpenAI (선택)

`OPENAI_API_KEY` 없으면 금칙어·스팸 필터만 적용됩니다.

---

**다시보기(VOD)** 는 제공하지 않습니다. 방송 종료 후 `/voice/[id]`는 안내만 표시됩니다.
