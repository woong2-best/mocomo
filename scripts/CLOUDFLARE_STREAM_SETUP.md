# MoCoMo — Cloudflare Stream Live

## 구조

```text
OBS (RTMPS) → Cloudflare Stream Live Input → 글로벌 CDN (HLS)
시청: mocomo.net 플레이어 (hls.js, Vercel 프록시 없음)
통화/DM: LiveKit (별도, LIVEKIT_* 유지)
```

Vultr SRS / LiveKit 방송은 사용하지 않습니다.

## 1. Cloudflare 대시보드

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Stream** 구독 활성화
2. **Live inputs** → 테스트 입력 하나 만들어 HLS URL 형식 확인
3. **Account ID** 복사 (오른쪽 사이드바)
4. API Token: `Stream:Edit` 권한
5. **Customer subdomain** 복사  
   예: `customer-xxxxx.cloudflarestream.com`  
   (Live input 상세 → Embed / HLS manifest URL에 포함)

## 2. Vercel 환경 변수

```env
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_STREAM_API_TOKEN=your_api_token
NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_HOST=customer-xxxxx.cloudflarestream.com
LIVE_INGEST_ENGINE=cloudflare
```

선택:

```env
NEXT_PUBLIC_APP_URL=https://mocomo.net
```

## 3. OBS

1. MoCoMo 스튜디오 → **키 다시 받기**
2. **서버**: `rtmps://live.cloudflare.com:443/live` (또는 스튜디오 표시값)
3. **방송 키**: 스튜디오에 표시된 긴 키
4. 인코더 키프레임 **2초**
5. **방송 시작**

⚠️ `45.32.16.32` (Vultr) 는 넣지 마세요.

## 4. 확인

- `https://mocomo.net/api/health/obs` → `"engine":"cloudflare"`
- 플레이어 배지: **LIVE · Cloudflare**
- F12 → `playback` → `"engine":"cloudflare"`, `hlsUrl`에 `cloudflarestream.com`

## 5. 문제 해결

| 증상 | 조치 |
|------|------|
| API 403 | 토큰에 Stream Edit 권한 |
| HLS만 로딩 | OBS 방송 시작 후 15초 대기, 키프레임 2초 |
| 여전히 VPS 문구 | 키 다시 받기 + OBS 서버를 live.cloudflare.com 으로 |
| Ingress 한도 (LiveKit) | LiveKit은 방송에 안 씀 — 무시 |

## 6. 비용

Cloudflare Stream은 시청 분·저장 용량 과금. [Stream pricing](https://developers.cloudflare.com/stream/pricing/) 참고.
