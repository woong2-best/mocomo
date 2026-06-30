# Release QA — E2E 시나리오

**목적:** 기능 단위 테스트가 아니라 **유저 Persona** 기준으로 출시 전 회귀를 검증한다.

**Sprint:** RC Sprint 2 — [Complete User Experience Validation](./RC_SPRINT_2_UX_VALIDATION.md)  
**로드맵:** [RC_SPRINT_ROADMAP.md](./RC_SPRINT_ROADMAP.md)

**실행 시점:** RC Sprint 2 전체 실행 · Production 전 최종 1회

**환경:** Android 실기기 1대 + 웹(Chrome) 1대 + 스테이징 DB

**자동화 (배포 후):**

```bash
npm run health:prod    # /api/health, summary
npm run smoke:api      # feed API, 주요 페이지
npm run economy:stress # Persona 3 경제 (일부)
npm run persona:smoke  # 웹 스크린샷 32장
```

---

## Persona 1 — 신규 유저 (Day 0)

> 설치 → 첫 집 → 첫 소비 → 종료

| # | Step | 검증 | Pass | Notes |
|---|------|------|------|-------|
| 1.1 | 앱 설치 / 첫 실행 | 크래시 없음, 스플래시 정상 | ☐ | |
| 1.2 | 회원가입 | 이메일 인증, 세션 유지 | ☐ | |
| 1.3 | 튜토리얼 (있으면) | 완료/스킵 후 상태 저장 | ☐ | |
| 1.4 | 첫 집 진입 | First Entry 5초 시퀀스, 로딩 ≤0.5s | ☐ | `?replayIntro=1` |
| 1.5 | 거실 다이오라마 | 스티커·배경 정상 렌더 | ☐ | |
| 1.6 | 첫 가구 배치 | 편집 → 저장 → 재접속 유지 | ☐ | |
| 1.7 | 골드 상점 | 구매 or 잔액 확인 | ☐ | |
| 1.8 | 라이브 시청 | 보상 지급, 일일 한도 | ☐ | |
| 1.9 | 친구/방문 (있으면) | 방문 모드, 읽기 전용 | ☐ | |
| 1.10 | 앱 종료 → 재실행 | Local cache ↔ server sync | ☐ | |
| 1.11 | 알림 탭 | 목록 · 딥링크 · empty state | ☐ | Sprint 2 |
| 1.12 | 로그아웃 → 재로그인 | 세션 종료 · 데이터 유지 | ☐ | Sprint 2 |
| 1.13 | Empty state | 미션/친구/창고 빈 화면 UX | ☐ | Sprint 2 |

---

## Persona 2 — 헤비 유저 (Day 7+)

> 장터 · 벼룩 · 오프라인 · 일일 루프

| # | Step | 검증 | Pass | Notes |
|---|------|------|------|-------|
| 2.1 | 로그인 | 세션·지갑 잔액 정확 | ☐ | |
| 2.2 | P2P 장터 | 등록 → 구매 → wallet 반영 | ☐ | |
| 2.3 | 벼룩시장 | listing → sold → 정산 | ☐ | |
| 2.4 | 라이브 보상 | 중복 지급 없음 | ☐ | |
| 2.5 | 미션/골드 획득 | mission → wallet | ☐ | |
| 2.6 | 오프라인 편집 | pending ops 생성 | ☐ | |
| 2.7 | 온라인 복귀 | sync 성공, 충돌 없음 | ☐ | |
| 2.8 | 다음날 접속 | daily reset, notification | ☐ | |
| 2.9 | 젬 환전 | gems → gold | ☐ | |
| 2.10 | IAP 구매 (실기기) | verify → fulfill → wallet | ☐ | Sprint 2 · Closed Testing |
| 2.11 | IAP 복원 | restore purchases | ☐ | Sprint 2 |

---

## Persona 3 — 악성 유저

> Fraud · IAP · 오프라인 조작

| # | Step | 검증 | Pass | Notes |
|---|------|------|------|-------|
| 3.1 | 다계정 자기거래 | SELF_MARKET 탐지 or 차단 | ☐ | |
| 3.2 | 골드 복사 시도 | duplicate reference 차단 | ☐ | |
| 3.3 | IAP 중복 토큰 | 멱등, alreadyFulfilled | ☐ | `APT_IAP_DEV_VERIFY=true` |
| 3.4 | IAP 환불 | gem clawback, VOIDED | ☐ | stress scenario 8 |
| 3.5 | 오프라인 조작 | replay reject | ☐ | |
| 3.6 | Rapid login | RAPID_LOGIN watch | ☐ | |
| 3.7 | IAP 환불 (실기기) | voided → gem clawback | ☐ | Sprint 2 |

**자동화:** `npm run economy:stress` (Persona 3 일부)

---

## Persona 4 — 운영자

> 장애 대응 · Backup · Canary

| # | Step | 검증 | Pass | Notes |
|---|------|------|------|-------|
| 4.1 | Market OFF (kill switch) | listing/구매 차단 | ☐ | `/admin/economy/flags` |
| 4.2 | IAP OFF | verify 422 | ☐ | |
| 4.3 | Backup snapshot | 수동 + 자동 스냅샷 | ☐ | |
| 4.4 | Restore dry-run | checksum, diff | ☐ | |
| 4.5 | Canary 1% → rollback | health auto action | ☐ | |
| 4.6 | Health alert | score < threshold → notify | ☐ | |
| 4.7 | CS corr 조회 | IAP orderId → audit timeline | ☐ | |
| 4.8 | CS IAP replay | stuck purchase 재처리 | ☐ | |
| 4.9 | 정상화 | flags ON, health green | ☐ | |

---

## RC Gate (출시 판단)

다음 **모두** Pass 시 Production 진입 — [RC_SPRINT_ROADMAP.md](./RC_SPRINT_ROADMAP.md) Release Gate 참조.

- [ ] Persona 1: **1.1 ~ 1.13** 전부 Pass
- [ ] Persona 2: **2.1 ~ 2.11** 전부 Pass
- [ ] Persona 3: **3.1 ~ 3.7** Pass (stress + 실기기 환불 1건)
- [ ] Persona 4: **4.1 ~ 4.9** Pass
- [ ] RC Sprint 2 DoD (Empty · Error · Motion · 버그 예산)
- [ ] `RC_FIRST_IMPRESSION.md` First Entry DoD
- [ ] Android 실기기 IAP Closed Testing
- [ ] 크래시 0건 (24h 스테이징)

---

## 버그 기록 템플릿

Sprint 2 Backlog: [RC_SPRINT_2_BACKLOG.md](./RC_SPRINT_2_BACKLOG.md)  
QA 기준 (P0~P3 · Frequency · Won't Fix): [RC_SPRINT_2_QA_STANDARDS.md](./RC_SPRINT_2_QA_STANDARDS.md)

### Issue (`ISSUE-###`)

```
ISSUE-###
Persona: 1|2|3|4 | Step: x.x | Screen:
Category: Bug | Motion | Loading | Empty | Error | ...
Summary:

Severity: P0 | P1 | P2 | P3
Frequency: Always | Often | Rare | One-time
Platform: Web | Android | Tablet(Fold)
Build: RC2-___
Condition: (Rare/One-time 시)

Repro: / Expected: / Actual:
Screenshot: docs/sprint2-audit/...
Recording: docs/sprint2-audit/recordings/...

Status: Open | Fixed | Won't Fix | Deferred
Won't Fix Reason: / Review After:
```

### UX Debt (`UXD-###`)

```
UXD-### | Screen: | Current: | Target:
Priority: High | Medium | Low
Status: Open | Done | Won't Fix | Deferred
Won't Fix Reason: / Review After:
```

---

## 관련 문서

- [RC_SPRINT_ROADMAP.md](./RC_SPRINT_ROADMAP.md) — Sprint 1~4 · RC 종료 조건
- [RC_SPRINT_2_QA_STANDARDS.md](./RC_SPRINT_2_QA_STANDARDS.md) — **P0~P3 · Frequency · Won't Fix · Lock**
- [RC_SPRINT_2_BACKLOG.md](./RC_SPRINT_2_BACKLOG.md) — Issue · UX Debt Backlog
- [RC_SPRINT_2_UX_VALIDATION.md](./RC_SPRINT_2_UX_VALIDATION.md) — Sprint 2 일정
- [RC_FIRST_IMPRESSION.md](./RC_FIRST_IMPRESSION.md) — First Impression DoD
- [RC_SPRINT_1_LIVING_ROOM_STYLE_LOCK.md](./RC_SPRINT_1_LIVING_ROOM_STYLE_LOCK.md) — 거실 Style Lock
- [BONDEE_STYLE_BIBLE.md](./BONDEE_STYLE_BIBLE.md) — 조명·재질 스펙
