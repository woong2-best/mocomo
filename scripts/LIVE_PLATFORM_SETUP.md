# MoCoMo 라이브 플랫폼 — 설정 가이드

## 권장: Cloudflare Stream Live

| 단계 | 기술 |
|------|------|
| OBS | RTMPS → **Cloudflare Live Input** |
| 시청 | **HLS** (Cloudflare CDN, `hls.js`) |
| 통화/DM | **LiveKit** (`LIVEKIT_*`) |

자세한 설정: **`scripts/CLOUDFLARE_STREAM_SETUP.md`**

## 예비 엔진

| `LIVE_INGEST_ENGINE` | 용도 |
|----------------------|------|
| `cloudflare` (기본) | 권장 |
| `livekit` | WebRTC 방송 (한도 주의) |
| `srs` | Vultr VPS (비권장) |

## Supabase

`scripts/supabase-fix-all.sql` 라이브 섹션 실행.

## Socket

```bash
npm run dev:socket
```
