# MoCoMo 라이브 플랫폼 — 설정 가이드

## 권장 아키텍처 (트위치/유튜브와 동일)

| 단계 | 기술 |
|------|------|
| OBS 송출 | RTMP → **LiveKit Cloud Ingress** |
| 시청 | 브라우저 **WebRTC** (`LivekitLivePlayer`) |
| 채팅 | Socket.IO + DB |

VPS SRS + HLS/FLV 프록시는 **예비**(`LIVE_INGEST_ENGINE=srs`)이며, Vercel 경유 재생이 불안정할 수 있습니다.

## 1. Supabase SQL (필수)

`scripts/supabase-fix-all.sql`에서 라이브 관련 섹션 실행.

## 2. Vercel 환경 변수 (LiveKit — 필수)

| 변수 | 용도 |
|------|------|
| `LIVEKIT_API_KEY` | LiveKit Cloud API |
| `LIVEKIT_API_SECRET` | LiveKit Cloud API |
| `NEXT_PUBLIC_LIVEKIT_URL` | `wss://프로젝트.livekit.cloud` |
| `LIVEKIT_URL` | (선택) Egress/API용 `https://…` |
| `LIVE_INGEST_ENGINE` | `livekit` (기본) 또는 `srs` |

LiveKit Cloud → **Ingress** 활성화 (RTMP). 무료 플랜은 Ingress 개수 한도 있음 → MoCoMo 「키 다시 받기」로 정리.

### VPS SRS (선택, 비권장)

| 변수 | 용도 |
|------|------|
| `SRS_RTMP_URL` | OBS RTMP |
| `NEXT_PUBLIC_SRS_HLS_BASE_URL` | HLS 베이스 |
| `LIVE_INGEST_ENGINE` | `srs` 로 고정 시에만 |

## 3. OBS (LiveKit)

1. MoCoMo 스튜디오 → **서버** / **방송 키** 복사  
2. OBS → 설정 → 방송 → 사용자 지정 → 서버·키 붙여넣기  
3. **방송 시작** (다중 송출 플러그인 없어도 됨)  
4. 스튜디오에 **LiveKit** 배지 + 영상 확인  

## 4. Socket 서버

```bash
npm run dev:socket
```

## 5. Ingress 한도 초과 시

1. [cloud.livekit.io](https://cloud.livekit.io) → Ingress → 오래된 항목 삭제  
2. MoCoMo → **키 다시 받기**  
3. OBS 방송 재시작  

임시로 VPS만 쓰려면 Vercel에 `LIVE_INGEST_ENGINE=srs` + SRS 변수 설정.

---

**다시보기(VOD)** 는 제공하지 않습니다.
