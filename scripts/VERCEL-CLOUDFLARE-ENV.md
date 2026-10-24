# Vercel — Cloudflare Workers AI (LLM 비상 폴백)

Gemini / Groq / OpenAI 한도(429·402·quota) 소진 시 서버 LLM이 바로 Workers AI로 이어갑니다. OpenAI Moderation은 제외.

| 변수 | 값 |
|------|-----|
| `CF_ACCOUNT_ID` | 대시보드 오른쪽 **Account ID** (32 hex) |
| `CF_API_TOKEN` | [API Tokens](https://dash.cloudflare.com/profile/api-tokens) → Workers AI **Run** |
| `CF_WORKERS_AI_MODEL` | 선택. 기본 `@cf/meta/llama-3.1-8b-instruct` |
| `CF_AI_SKIP_MS` | 선택. 한도 난 프로바이더를 건너뛰는 시간(ms). 기본 `600000` |

`CF_ACCOUNT_ID`가 없으면 `CLOUDFLARE_ACCOUNT_ID`(Stream)를 씁니다. 저장 후 Git `main` 배포가 Ready여야 반영됩니다.

---

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

---

# Vercel — Cloudflare Calls TURN (DM P2P)

[Realtime → TURN](https://dash.cloudflare.com/?to=/:account/calls/turn)에서 **Create TURN key** 후 Vercel → **Settings → Environment Variables**:

| 변수 | Exposure | 값 |
|------|----------|-----|
| `TURN_PROVIDER` | Server | `cloudflare` |
| `CLOUDFLARE_TURN_KEY_ID` | Server | TURN key ID |
| `CLOUDFLARE_TURN_KEY_TOKEN` | Server | TURN key API token |
| `CLOUDFLARE_TURN_TTL_SEC` | Server | `3600` (선택) |

`CLOUDFLARE_*` TURN 토큰은 **NEXT_PUBLIC_ 접두사 금지** — 클라이언트는 `/api/webrtc/ice-servers` 로만 수신.

저장 후 Redeploy. 로그인 상태에서 `GET /api/webrtc/ice-servers` → `turnEnabled: true` 확인.

상세: `docs/VOICE_MIGRATION.md`
