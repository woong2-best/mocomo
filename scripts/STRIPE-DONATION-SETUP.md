# Stripe 실제 후원 설정 (MoCoMo)

후원은 **Stripe Checkout** 으로 결제됩니다. (카드·간편결제는 Stripe 대시보드에서 활성화)

## 1. Stripe 키 발급

1. https://dashboard.stripe.com/test/apikeys  
2. **Publishable key** → Vercel `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`  
3. **Secret key** → Vercel `STRIPE_SECRET_KEY`

## 2. Webhook (결제 완료 + Star Market escrow + Used auction holds + Connect)

동일 URL에 **두 개의** Stripe Webhook 엔드포인트를 둘 수 있습니다. Signing secret은 엔드포인트마다 다릅니다.

1. https://dashboard.stripe.com/webhooks → **Add endpoint**
2. URL: `https://<host>/api/webhooks/stripe`
3. **Your account** 엔드포인트 이벤트 예:
   - `checkout.session.completed`
   - `transfer.reversed`
   - (필요 시) `payment_intent.*`, `charge.dispute.*`
4. **Connected accounts** 엔드포인트 이벤트 예:
   - `account.updated`
   - `payout.failed`
5. Signing secrets → Vercel:
   - Your account → `STRIPE_WEBHOOK_SECRET`
   - Connected accounts → `STRIPE_CONNECT_WEBHOOK_SECRET`

`src/app/api/webhooks/stripe/route.ts`는 두 secret을 순서대로 검증합니다.

검증: `node --env-file=.env scripts/smoke-used-auction-pipeline.mjs preflight`

로컬 테스트: Stripe CLI `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

## 3. Vercel 환경 변수

| 변수 | 필수 |
|------|------|
| `STRIPE_SECRET_KEY` | ✅ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ |
| `STRIPE_WEBHOOK_SECRET` | ✅ (Your account 웹훅) |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | ✅ (Connected accounts 웹훅) |
| `NEXT_PUBLIC_APP_URL` | ✅ `https://mocomo.net` |

저장 후 **Redeploy**.

## 4. 확인

- https://mocomo.net/api/health/payments → `"configured":true`  
- 다른 계정 프로필 → **후원** 버튼 → 테스트 카드 `4242 4242 4242 4242`

## 5. 후원 흐름

1. 시청자가 금액·메시지 선택 → Stripe 결제  
2. 성공 시 `Tip` DB 저장, 크리에이터 **정산 잔액** 증가 (`/wallet`)  
3. 개별·플랫폼 **광석 등급** 갱신, 알림 발송  

수수료: 플랫폼 10%, 크리에이터 90%.

## 6. 라이브 방송 후원

`NEXT_PUBLIC_LIVE_ENABLED=true` 일 때 방송 화면·채팅에도 동일 후원 버튼이 표시됩니다.
