# Stripe 실제 후원 설정 (MoCoMo)

후원은 **Stripe Checkout** 으로 결제됩니다. (카드·간편결제는 Stripe 대시보드에서 활성화)

## 1. Stripe 키 발급

1. https://dashboard.stripe.com/test/apikeys  
2. **Publishable key** → Vercel `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`  
3. **Secret key** → Vercel `STRIPE_SECRET_KEY`

## 2. Webhook (결제 완료 + Star Market escrow + Used auction holds)

1. https://dashboard.stripe.com/test/webhooks → **Add endpoint** (staging은 prod와 **별도** endpoint + `whsec_…`)
2. URL: `https://<staging-host>/api/webhooks/stripe`
3. 이벤트 (필수):
   - `checkout.session.completed`
   - `payment_intent.amount_capturable_updated`
   - `payment_intent.succeeded`
   - `charge.dispute.created`
   - `charge.dispute.closed`
   - `charge.dispute.funds_withdrawn`
4. Signing secret → staging Vercel `STRIPE_WEBHOOK_SECRET` (prod whsec와 혼용 금지)

검증: `node --env-file=.env scripts/smoke-used-auction-pipeline.mjs preflight`

로컬 테스트: Stripe CLI `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

## 3. Vercel 환경 변수

| 변수 | 필수 |
|------|------|
| `STRIPE_SECRET_KEY` | ✅ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ |
| `STRIPE_WEBHOOK_SECRET` | ✅ (웹훅) |
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
