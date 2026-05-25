# MoCoMo

서브컬처 올인원 커뮤니티 — 애니덕질, 코스프레, 굿즈, 커뮤니티, SNS, 라이브, 후원.

## 기능

- **회원**: 이메일/소셜 로그인, 프로필, 팔로우, 레벨
- **SNS**: 피드, 좋아요, 리포스트, 댓글, 북마크, 탐색
- **채팅**: DM/그룹, Socket.IO 실시간 + DB 저장
- **라이브**: LiveKit 영상/음성 + 실시간 채팅 (LiveKit 키 필요)
- **코스프레**: 등록, 프로필, 애니 연동
- **후원/마켓/프리미엄**: Toss Payments 연동 (키 설정 시)
- **관리**: 신고, 밴, 통계

## 시작하기

```bash
npm install
cp .env.example .env
npm run db:push
npm run dev
```

- 웹: http://localhost:3000
- Socket: http://localhost:3001

회원가입: `/auth/signup`

## 필수 환경 변수

| 변수 | 용도 |
|------|------|
| `DATABASE_URL` / `DIRECT_URL` | PostgreSQL (Supabase 등) |
| `AUTH_SECRET` | NextAuth 세션 |

## 선택 환경 변수 (기능별)

| 변수 | 용도 |
|------|------|
| `TOSS_SECRET_KEY` + `NEXT_PUBLIC_TOSS_CLIENT_KEY` | 후원, 마켓, 프리미엄 결제 |
| `LIVEKIT_*` | 라이브 방송 |
| `S3_*` | 파일 업로드 (없으면 `/api/upload/local`) |
| `RESEND_API_KEY` | 비밀번호 재설정 이메일 |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO 서버 URL |

## 결제 (Toss)

1. [Toss Payments](https://developers.tosspayments.com)에서 테스트/라이브 키 발급
2. `.env`에 `TOSS_SECRET_KEY`, `NEXT_PUBLIC_TOSS_CLIENT_KEY` 설정
3. 후원·마켓·프리미엄 버튼이 활성화됩니다

## 업로드

- **프로덕션**: S3/R2 `S3_*` 설정 → presigned URL
- **로컬 개발**: `POST /api/upload/local` (multipart, `public/uploads/` 저장)

## 배포

- 웹: Vercel
- DB: Supabase / Neon
- Socket: Railway 등에 `server/socket.ts` 별도 실행

## 라이선스

Private — MoCoMo Project
