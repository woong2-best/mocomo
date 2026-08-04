# 자체 송출 인프라 비용 인벤토리 (Phase 0)

작성: 코드·네트워크 프로브·DB 통계 기준. **대시보드 실청구액은 계정 소유자가 채워 넣을 것.**

## 이용자 규모 (DB, 실행 시각 기준)

| 지표 | 값 |
|---|---|
| 현재 LIVE (`live_now`) | **0** |
| 30일 관련 채널 / 호스트 | **37** / **4** |
| 7일 라이브 채팅 | **0** |
| 30일 채널 Tip | **0** |
| PostMedia Stream/HLS | **0** |
| `cf:` Live Input 잔존 | **12** |
| `srs:` 채널 잔존 | **5** |

판정: 현재 방송 중은 없으나 30일 호스트 흔적 있음 → **짧은 중단 공지 권장** 후 숨김.

재실행: `node scripts/live-usage-stats.mjs`

## 서비스별

| 서비스 | 상태 (프로브) | 코드 용도 | 해지 |
|---|---|---|---|
| **Cloudflare Stream Live** | env에 로컬 키 없음 — 대시보드 확인 | OBS RTMPS / HLS | Live Inputs·녹화 삭제 후 **Live 중단**. 구독 해지는 아래 VOD 참고 |
| **Cloudflare Stream VOD** | DB상 `streamUid`/`hlsUrl` **0건** | 피드 HLS 패키징 | **현재 사용 없음 → Stream 구독 해지 가능**. 해지 전 대시보드 라이브러리 재확인 |
| **LiveKit Cloud** | 로컬 `.env`에 키 존재 | **통화/DM 유지** + (구) Ingress 방송 | **프로젝트 해지 금지**. Ship→Build 다운그레이드만 검토 |
| **Vultr SRS `45.32.16.32`** | **아직 기동 중** (TCP 1935 / :8080 200, 2026-08-03 재확인). 코드의 IP 폴백은 제거됨. SSH/API 키 없어 원격 전원 OFF 불가 → **Vultr 대시보드에서 수동 정지/삭제 필요** | 폴백 RTMP/HLS (비활성) | **수동으로 전원 OFF/삭제** |
| **Render Socket** | free 플랜 | 채팅 — 유지 | 유지 |
| **Stripe** | — | 후원 — 유지 | 유지 |

## 해지 체크리스트

1. [ ] Cloudflare Stream → Live Inputs 전부 삭제, 라이브 녹화 삭제  
2. [ ] Stream 라이브러리에 VOD 없는지 확인 → 없으면 Stream 구독 해지  
3. [ ] Vultr `45.32.16.32` 스냅샷 후 destroy / power off  
4. [ ] LiveKit: 플랜 확인, Ingress 미사용 확인, **프로젝트 유지**  
5. [ ] Vercel: `NEXT_PUBLIC_LIVE_ENABLED=false`, `NEXT_PUBLIC_EXTERNAL_LIVE_ENABLED=true`  
6. [ ] (선택) 호스트 4명에게 자체 송출 중단 + 외부 연동 안내

## VOD 결정

**결정: Stream VOD는 현재 미사용(DB 0건). Live Input 정리 후 Stream 제품 해지 가능.**  
피드 영상은 progressive URL(`PostMedia.url`)로 재생. 추후 HLS가 필요하면 별도 CDN 재검토.

## 치지직 embed 프로브 (2026-08-03)

`https://chzzk.naver.com/embed/live/{channelId}` → HTTP **200**, X-Frame-Options/CSP frame-ancestors **없음**.  
→ **임베드 시도 허용** (기본). 실제 iframe이 비면 UI가 “새 창에서 시청” 폴백.  
강제: `NEXT_PUBLIC_CHZZK_EMBED_ENABLED=true|false`  
재실행: `node scripts/probe-chzzk-embed.mjs <channelId>`

## 대시보드에서 채울 실액

| 항목 | 월 청구 (채우기) | 플랜명 |
|---|---|---|
| Cloudflare Stream | $____ | |
| LiveKit Cloud | $____ | Build / Ship / Scale |
| Vultr VPS | $____ | |
