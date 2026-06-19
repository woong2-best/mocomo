# MoCoMo Studio 배포 가이드

Studio는 **같은 Next.js 앱**에서 `studio.mocomo.com` 서브도메인으로 서비스됩니다.  
코드는 `studio/` + `src/app/studio/`에 있으며, `src/middleware.ts`가 서브도메인을 `/studio/*`로 rewrite 합니다.

## 1. Vercel 도메인

1. [Vercel 프로젝트](https://vercel.com) → **Settings → Domains**
2. **Add** → `studio.mocomo.com` (스테이징: `studio-staging.mocomo.com`)
3. Vercel이 안내하는 **CNAME** 값을 DNS에 추가

## 2. DNS (예: Cloudflare / 가비아)

| 타입 | 이름 | 값 |
|------|------|-----|
| CNAME | `studio` | `cname.vercel-dns.com` (Vercel 대시보드에 표시된 값) |

로컬 개발: `http://studio.localhost:3000` (hosts 불필요, middleware 지원)

## 3. 환경 변수 (Vercel Production)

`.env.example`의 Studio 섹션을 참고해 설정:

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_STUDIO_URL` | `https://studio.mocomo.com` |
| `NEXT_PUBLIC_STUDIO_HOST` | `studio.mocomo.com` |
| `STUDIO_INTEGRATION_SECRET` | MoCoMo ↔ Studio API 공유 시크릿 (APT 보관함, 정산) |
| `STUDIO_STORAGE_BUCKET` | (선택) Studio 전용 Supabase 버킷, 미설정 시 `SUPABASE_STORAGE_BUCKET` + `studio/` prefix |

기존 MoCoMo 변수도 동일하게 필요: `DATABASE_URL`, `AUTH_SECRET`, `STRIPE_*`, `SUPABASE_*` 등.

## 4. Supabase Storage

- 기본: `mocomo-uploads` 버킷 내 `studio/{userId}/` 경로
- 권장(선택): 별도 버킷 `mocomo-studio` 생성 후 `STUDIO_STORAGE_BUCKET=mocomo-studio` 설정

## 5. Stripe

Studio 유료 자산 구매는 `PaymentIntentType.STUDIO_ASSET`으로 Checkout 생성.  
Webhook `checkout.session.completed`는 기존 `/api/webhooks/stripe`와 동일.

## 6. MoCoMo APT 연동

APT 방 꾸미기 패널의 **MoCoMo Studio 보관함**은:

- `GET /api/integrations/studio-inventory?userId=...`
- Header: `x-studio-secret: {STUDIO_INTEGRATION_SECRET}`

MoCoMo 앱 내 구매 정산:

- `POST /api/integrations/studio-settlement`

## 7. 배포 확인

```bash
npm run build
# 또는 Vercel: main 브랜치 push → vercel-build (prisma db push 포함)
```

체크리스트:

- [ ] `https://studio.mocomo.com` → Studio 홈
- [ ] `https://mocomo.com/studio` → 동일 (또는 리다이렉트 정책에 따름)
- [ ] 로그인 SSO (MoCoMo 계정)
- [ ] GLB/OBJ/FBX 업로드 + 미리보기
- [ ] APT → Studio 보관함 목록

## 8. 운영자

검수·출금: `/studio/admin/review`, `/studio/admin/payouts`  
`SITE_OPERATOR_USERNAME` 또는 DB `ADMIN` 역할 필요.
