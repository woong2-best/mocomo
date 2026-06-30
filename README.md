# MoCoMo

서브컬처 올인원 플랫폼 — SNS, 라이브, 미니게임, APT 가상 집, 중고거래, 매칭, 아바타 스튜디오.

**프로덕션:** [mocomo.net](https://mocomo.net) · **단계:** RC Sprint 2

## 주요 기능

| 영역 | 경로 | 설명 |
|------|------|------|
| 피드·탐색 | `/feed`, `/explore` | SNS, 트렌딩, 검색 |
| 매칭 | `/discover` | 스와이프 매칭 |
| 게임 | `/games`, `/play/*` | 21종 미니게임, 랭킹·시즌 |
| APT | `/play/house` | 다이오라마, 경제, IAP, 장터 |
| 중고 | `/used` | 전국 거래, 경매, 지도 |
| 라이브·음성 | `/live`, `/voice` | LiveKit, OBS/SRS |
| 메시지 | `/messages` | DM·그룹, Socket.IO |
| 아바타 | `/avatar/studio` | 2D/3D VRM 방송 |
| 스튜디오 | `studio.mocomo.net` | 크리에이터 자산 마켓 |

## 시작하기

```bash
npm install
cp .env.example .env
npm run db:push
npm run dev          # 웹 :3000 + Socket :3001
```

## 필수 환경 변수

| 변수 | 용도 |
|------|------|
| `DATABASE_URL` / `DIRECT_URL` | PostgreSQL |
| `AUTH_SECRET` | NextAuth 세션 |

## 선택 환경 변수

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO (Railway 등) |
| `LIVEKIT_*` | 라이브·음성 WebRTC |
| `VAPID_*` + `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Web Push |
| `FIREBASE_SERVER_KEY` / `FCM_SERVER_KEY` | Android FCM |
| `GOOGLE_PLAY_*` / `APPLE_IAP_*` | 인앱 결제 |
| `STRIPE_*` / Toss | 후원·정산 |
| `S3_*` | 파일 업로드 |
| `RESEND_API_KEY` | 이메일 인증 |

## Android 앱

```bash
npm run cap:sync          # Android
npm run cap:sync:ios      # iOS (Mac + Xcode)
npm run android:bundle    # Play Store AAB
```

Remote WebView → `https://mocomo.net` (`capacitor.config.ts`)

→ [Android QA](./docs/ANDROID_QA.md) · [Play Store](./docs/PLAY_STORE_PRIVATE.md) · [푸시 설정](./docs/PUSH_SETUP.md)

## iOS

```bash
npm run cap:sync:ios
npm run cap:open:ios   # Mac + Xcode 필요
```

→ [iOS 설정 가이드](./docs/IOS_APP_SETUP.md) · `ios/` 프로젝트 포함

## QA · 배포 후 검증

```bash
npm run health:prod       # 프로덕션 헬스
npm run smoke:api         # API·페이지 스모크
npm run persona:smoke     # Playwright 스크린샷
npm run economy:stress    # 경제 스트레스
```

→ [RELEASE_QA.md](./docs/RELEASE_QA.md) · [RC Sprint 로드맵](./docs/RC_SPRINT_ROADMAP.md)

## 배포

- **웹:** `npx vercel --prod`
- **DB:** `prisma db push` (Vercel `vercel-build`에 포함)
- **Socket:** `npm run start:socket` 별도 프로세스
- **헬스:** `/api/health`, `/api/health/summary`

## 문서

| 문서 | 내용 |
|------|------|
| [APT Art Bible](./docs/APT_ART_BIBLE.md) | 다이오라마 아트 기준 |
| [RC Sprint 2 Backlog](./docs/RC_SPRINT_2_BACKLOG.md) | 남은 이슈 |
| [Android QA](./docs/ANDROID_QA.md) | 실기기 체크리스트 |

## 라이선스

Private — MoCoMo Project
