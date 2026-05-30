# Vercel — Cloudflare Stream (필수 3개)

Stream $0 플랜 구독 후 Vercel → **Settings → Environment Variables**:

| 변수 | 값 |
|------|-----|
| `CLOUDFLARE_ACCOUNT_ID` | Stream 대시보드 오른쪽 **계정 ID** |
| `CLOUDFLARE_STREAM_API_TOKEN` | [API Tokens](https://dash.cloudflare.com/profile/api-tokens) → Stream **Edit** |
| `LIVE_INGEST_ENGINE` | `cloudflare` |

선택 (권장 — Stream 대시보드 **계정 정보**에 표시된 값):

| 변수 | 값 |
|------|-----|
| `NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_HOST` | `customer-xxxxx.cloudflarestream.com` |

없으면 서버가 Live Input·동영상 목록 API로 자동 추출합니다. Live Input이 0개이면 부트스트랩 입력을 하나 만듭니다.

저장 후 **Deployments → Redeploy**.

확인: `https://mocomo.net/api/health/obs` → `"engine":"cloudflare","configured":true`
