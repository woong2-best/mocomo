# RC Sprint 2 — Day 0 Persona Audit

**규칙: Day 0에는 코드를 수정하지 않는다.**  
관찰 · 기록 · 스크린샷 · 타이밍 측정만 한다.

**목표:** ~100 Issue + ~40 UX Debt (최소 50 + 20)  
**기준서:** [RC_SPRINT_2_QA_STANDARDS.md](./RC_SPRINT_2_QA_STANDARDS.md) — P0~P3 · Frequency · Won't Fix · Lock

**환경:** 웹(Chrome) 1대 + Android 실기기 1대 + (가능 시) Fold/Tablet + 스테이징 DB  
**참조:** [RELEASE_QA.md](./RELEASE_QA.md) · [RC_SPRINT_2_BACKLOG.md](./RC_SPRINT_2_BACKLOG.md)

---

**Gate:** 미통과 (~45–50%) — Static ✅ · 실기기 ❌

## Day 0 우선순위

| 순서 | 대상 | 이유 |
|------|------|------|
| **1** | Persona 1 (8단계) | "5분 안에 앱을 좋아하는가" — Apartment RC 핵심 |
| **2** | Android 실기기 | Safe Area · Keyboard · 뒤로가기 · Resume · Splash (웹에서 안 보임) |
| **3** | Persona 2 | 헤비 루프 |
| **4** | Stress / Persona 3~4 | UX·Android 끝낸 뒤 (stress fail → 재빌드 비용) |

### Persona 1 — 최우선 8단계

```
설치 → 회원가입 → 튜토리얼 → 첫 집 → 첫 가구 → 첫 저장 → 앱 종료 → 재접속
```

멈춤 · 빈 화면 · 로딩 · 애니메이션 · 버튼 · 설명 부족 → ISSUE / UXD

### 첫 5분 타이밍 시트 (Sprint 3 기준선)

각 Persona 1 런마다 기록. 목표는 가이드 — 초과해도 ISSUE/UXD로 남긴다.

| # | 구간 | 목표 | Web 실측 | Android 실측 | ISSUE/UXD |
|---|------|-----:|----------|--------------|-----------|
| T1 | 앱 실행 → 로그인 화면 | ≤2s | | | |
| T2 | 로그인 → 첫 집 진입 | ≤5s | | | |
| T3 | 첫 가구 배치 완료 | ≤15s | | | |
| T4 | 저장 피드백 | ≤500ms | | | |
| T5 | 재접속 → 집 표시 | ≤3s | | | |

## Day 0 체크리스트

- [ ] **① Persona 1 웹** — 8단계 완주
- [ ] **① Persona 1 Android** — 8단계 완주
- [ ] **② Android** — Safe Area / Resume / Splash 관찰
- [ ] Persona 2 (헤비) 1회
- [ ] **ISSUE 80~120** (현재 55 static) · **UXD ~40**
- [ ] **스크린샷 30~50** · **Recording 7종**
- [ ] Backlog Triaging + **Release Blocker** 확정
- [ ] (마지막) `economy:stress` + fraud-scan
- [ ] Persona 4 admin (선택, Day 0 말미)

---

## Persona 1 — 신규 유저 감사 경로

아래 순서대로 **멈추지 않고** 끝까지 간다. 각 화면에서 10초 이상 머물며 관찰.

```
가입
  ↓
이메일 인증
  ↓
튜토리얼 (있으면 완료/스킵)
  ↓
첫 집 진입 (First Entry 시퀀스)
  ↓
거실 다이오라마 (RC-1 레이아웃)
  ↓
첫 가구 배치 (편집 → 저장)
  ↓
첫 미션 (클레임)
  ↓
골드 상점 / 장터 둘러보기
  ↓
라이브 시청
  ↓
알림 탭
  ↓
로그아웃
  ↓
재접속 (세션 · 레이아웃 유지)
```

### 화면별 관찰 포인트

| 구간 | 보면 좋은 것 | 기록 유형 |
|------|-------------|----------|
| 가입/인증 | 로딩, 에러, 폼 피드백 | Bug · UX Debt |
| First Entry | duration, skip, 사운드 | UX Debt · Motion |
| 거실 | 카메라, ambient, 첫 인상 | UX Debt |
| 편집 | drag, haptic, toast, 저장 | Bug · Haptic |
| 미션/상점 | empty, sheet, 구매 피드백 | Empty · Error |
| 라이브 | 전환, 보상 toast | Motion · Bug |
| 알림 | empty state 유무 | Empty |
| 로그아웃/재접속 | sync, flash of wrong state | Bug · Skeleton |

### 타이밍 측정 (Skeleton 후보용)

각 구간에서 **빈 화면·스피너·"불러오는 중"** 구간의 체감 대기 시간을 기록한다.

```
화면: _______________
대기: ___초 (0.4초 이상이면 Skeleton 후보 표시)
기록: ISSUE-___ 또는 UXD-___
```

---

## Persona 2 — 헤비 유저 감사 경로

```
로그인
  ↓
P2P 장터 (등록 → 구매)
  ↓
벼룩시장
  ↓
미션/골드
  ↓
오프라인 편집 (비행기 모드)
  ↓
온라인 복귀 sync
  ↓
다음날 시뮬레이션 (daily reset — 가능 시)
  ↓
젬 환전
```

**Android 추가 (Day 4):** IAP 구매 · 복원 · 환불

---

## Persona 3 — 자동화 (Day 0 오후)

코드 수정 없이 스크립트만 실행하고 실패·경고를 이슈로 기록.

```bash
npm run economy:stress
npm run economy:stress:1000
npm run economy:fraud-scan
```

실패 시 → `ISSUE-###` · Severity P0/P1

---

## Persona 4 — 운영자 (Day 0 또는 Day 4)

`/admin/economy/flags` · backup · canary · health  
→ 장애 UI가 유저에게 어떻게 보이는지도 Persona 1 관점에서 재확인

---

## Issue 기록 규칙

모든 발견은 [RC_SPRINT_2_BACKLOG.md](./RC_SPRINT_2_BACKLOG.md)에 추가한다.  
**Severity(P0~P3) · Frequency · Platform · Build**는 필수 — [RC_SPRINT_2_QA_STANDARDS.md](./RC_SPRINT_2_QA_STANDARDS.md).

### Bug / Issue (`ISSUE-###`)

```
ISSUE-001
Persona: 1 | Step: 1.4
Screen: 첫 집 진입
Category: Loading
Summary: Loading이 심심함 — 텍스트만 표시

Severity: P2
Frequency: Always
Platform: Web
Build: RC2-001
Condition: —

Repro: 신규 계정 → /apt/house
Expected: Skeleton 또는 브랜드 로딩
Actual: "방 불러오는 중…" 텍스트만

Screenshot: docs/sprint2-audit/web/...
Recording: docs/sprint2-audit/recordings/web-first-entry.mp4

Status: Open
```

### UX Debt (`UXD-###`)

```
UXD-014
Screen: Toast
Category: Motion
Current: 상단, 2600ms
Target: Bottom center · 260ms
Priority: Medium
Linked: ISSUE-002
Status: Open
```

**분리 기준**

| 유형 | 예시 |
|------|------|
| **ISSUE** | 크래시, 데이터 손실, 버튼 무반응, 잘못된 금액 |
| **UXD** | Toast 위치, 애니메이션 속도, Empty 미디자인 |

**Won't Fix** — 수정 안 할 항목도 `Status` + `Reason` + `Review After` 필수 기록.

---

## Day 0 종료 — Triaging (같은 날 오후)

1. **Severity** — P0 / P1 / P2 / P3 ([기준표](./RC_SPRINT_2_QA_STANDARDS.md#1-severity-p0p3))
2. **Frequency** — Always / Often / Rare / One-time (모든 ISSUE 필수)
3. **Category** 집계 + Status (Open / Fixed / Won't Fix / Deferred)

```
P0  : __
P1  : __
P2  : __
P3  : __
UX Debt : __
────────────
ISSUE Total : __  (목표 ~100, 최소 50)
```

4. **Sprint 우선순위**
   - P0 → 즉시 · P1 → Day 1
   - P2 → Day 2~3 · P3 → Sprint 마지막
   - Frequency `Rare`/`One-time` → 재현 1회 더 후 재분류 또는 Won't Fix
   - Empty / Error / Motion / Skeleton → **이슈 목록에 있는 것만** Day 1~2

5. Day 1 코드 착수 — [RC_SPRINT_2_UX_VALIDATION.md](./RC_SPRINT_2_UX_VALIDATION.md)

---

## 증거 수집 (Screenshot · Recording)

### 스크린샷 — 30~50장

```
docs/sprint2-audit/
  web/          ← 10~20장
  android/      ← 10~20장
  tablet/       ← 5~10장 (Fold 등)
```

### Screen Recording — 7종 필수

애니메이션·로딩·피드백은 **영상**에서만 드러나는 경우가 많다.

```
docs/sprint2-audit/recordings/
```

| # | 장면 | 파일명 예 |
|---|------|----------|
| 1 | 첫 실행 | `*-first-launch.mp4` |
| 2 | 첫 집 진입 | `*-first-entry.mp4` |
| 3 | 가구 배치 | `*-furniture-place.mp4` |
| 4 | 장터 등록/구매 | `*-market.mp4` |
| 5 | Live 보상 | `*-live-reward.mp4` |
| 6 | IAP 구매 | `*-iap-purchase.mp4` (Day 4 Android) |
| 7 | 로그아웃 → 재접속 | `*-relogin.mp4` |

---

## 관련 문서

- [RC_SPRINT_2_QA_STANDARDS.md](./RC_SPRINT_2_QA_STANDARDS.md) — P0~P3 · Frequency · Won't Fix · Lock
- [RC_SPRINT_2_BACKLOG.md](./RC_SPRINT_2_BACKLOG.md) — 이슈 · UX Debt
- [RC_SPRINT_2_UX_VALIDATION.md](./RC_SPRINT_2_UX_VALIDATION.md) — Day 1~5
- [RELEASE_QA.md](./RELEASE_QA.md) — Persona step
