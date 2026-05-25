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
| `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 후원, 마켓, 프리미엄 (Stripe Checkout) |
| `LIVEKIT_*` | 라이브 방송 |
| `S3_*` | 파일 업로드 (없으면 `/api/upload/local`) |
| `RESEND_API_KEY` | 비밀번호 재설정 이메일 |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.IO 서버 URL |

## 결제 · 정산 (Stripe Checkout)

1. [Stripe](https://stripe.com/kr) 가입 · KYC · 정산 계좌 등록
2. [API 키](https://dashboard.stripe.com/apikeys) → `.env` / Vercel
3. [웹훅](https://dashboard.stripe.com/webhooks): `https://your-domain.com/api/webhooks/stripe` · 이벤트 `checkout.session.completed`
4. Supabase SQL **섹션 L** + `npx prisma db push`
5. **운영자** `/admin/finance` · **판매자** `/wallet`

결제는 Stripe로 수납되고, 판매자 몫은 지갑 적립 → 출금 신청 → 관리자 「입금 완료」 처리입니다.

## 업로드

- **프로덕션**: S3/R2 `S3_*` 설정 → presigned URL
- **로컬 개발**: `POST /api/upload/local` (multipart, `public/uploads/` 저장)

## 배포

- 웹: Vercel
- DB: Supabase / Neon
- Socket: Railway 등에 `server/socket.ts` 별도 실행

## 라이선스

Private — MoCoMo Project
