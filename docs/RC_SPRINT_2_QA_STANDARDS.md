# RC Sprint 2 — QA Standards

**역할:** QA Lead 기준서 — Severity · 재현율 · Won't Fix · Day 0 산출물 · Sprint Lock  
**적용:** [RC_SPRINT_2_BACKLOG.md](./RC_SPRINT_2_BACKLOG.md) · [RC_SPRINT_2_AUDIT.md](./RC_SPRINT_2_AUDIT.md)

---

## 1. Severity (P0~P3)

사람마다 기준이 달라지지 않도록 **숫자 등급으로 고정**한다.

| Severity | 기준 | 예시 | Day 1 착수 |
|----------|------|------|-----------|
| **P0** | 크래시 · 데이터 손실 · 결제 오류 · 진행 불가 | 앱 종료, 지갑 금액 틀림, IAP 미지급 | **즉시** (Day 0 중에도 기록만, 수정은 Day 1 AM) |

**P0 남용 금지** — 아래 **전부** 해당할 때만 P0. 그 외는 P1 이하로 Day 1 범위 관리.

* 데이터 손실 또는 보안 문제
* 결제(IAP) 관련 문제
* 크래시 또는 앱 사용 불가
* 다른 사용자의 데이터 노출
* 출시 시 서비스 신뢰를 크게 훼손하는 문제
| **P1** | 핵심 기능 실패 · 잘못된 경제 처리 · 심각한 UX | 미션 미지급, sync 실패, Toast/피드백 전무 | **Day 1** |
| **P2** | 사용 가능하나 불편 · 애니메이션/레이아웃 문제 | Motion 어색, Empty 미디자인, 0.5s 로딩 | **Day 2~3** |
| **P3** | 오타 · 간격 · 미세 디자인 | 2px 밀림, 문구 오타 | **Sprint 마지막** |

### Day 0 Gate — **통과 조건 (전부 ✅)**

| # | 조건 |
|---|------|
| 1 | Persona 1 **웹** 8단계 완주 |
| 2 | Persona 1 **Android** 8단계 완주 |
| 3 | Persona 2 완주 |
| 4 | Screenshot **30장+** |
| 5 | Recording **7개** |
| 6 | Backlog **80~120건** (품질: Repro + Evidence 필수) |
| 7 | **Release Blocker** 확정 |
| 8 | `economy:stress` **PASS** 또는 원인 분석 문서화 |

**통과 전:** 코드 수정 금지. **통과 후 Day 1:** Blocker ✅ → P1 → P2 → Motion/Empty/Skeleton.

### Persona 1 — 첫 5분 타이밍 (Sprint 3 성능 기준선)

| 구간 | 목표 | 기록 |
|------|-----:|------|
| 앱 실행 → 로그인 화면 | ≤2s | `T1` |
| 로그인 → 첫 집 진입 | ≤5s | `T2` |
| 첫 가구 배치 (완료까지) | ≤15s | `T3` |
| 저장 피드백 | ≤500ms | `T4` |
| 재접속 → 집 표시 | ≤3s | `T5` |

→ `RC_SPRINT_2_AUDIT.md` Persona 1 시트에 `T1~T5` 기록

### Day 0 종료 시 집계 예시

```
P0  : 0
P1  : 8
P2  : 31
P3  : 54
UX Debt : 42
────────────
Total Issues : 93
```

**Day 0 Gate:** 미통과 시 **코드 수정 금지**. 통과 후 Day 1은 **P0 Blocker → P1 Blocker → P2** 순 (Motion/Empty/Skeleton은 그 다음).

### Release Blocker (출시 차단)

Severity와 **독립**. Backlog `Blocker` 컬럼: ✅ = RC 출시 전 Fixed 필수.

| ID | Severity | Blocker | 비고 |
|----|----------|---------|------|
| ISSUE-004 | P0 | ✅ | **최상위** — IAP/경제 전체 위험 |
| ISSUE-001~003 | P0 | ✅ | 데이터·알림·폴백 |
| ISSUE-005, 008, 009, 012, 018 | P1 | ✅ | 보안·가입·로그아웃 |
| ISSUE-015 | P1 | ❌ | RC 이후 가능 (예시) |
| UXD-022 | P3 | ❌ | Deferred 가능 (예시) |

**Lock 시:** Blocker ✅ 항목 Status = `Fixed` (Won't Fix 불가).

### Fix Cost (수정 비용)

Severity와 **독립**. Day 1 계획 — **P0이라도 S부터** Blocker 수를 빠르게 줄인다.

| Fix Cost | 기준 | 예시 |
|----------|------|------|
| **S** | ~30분 | 문구, 토스트, 조건문, CSS |
| **M** | 반나절 | 단일 컴포넌트, 단일 API |
| **L** | 1~2일 | 여러 모듈, DB 변경 없음 |
| **XL** | 2일+ | 아키텍처, DB/플랫폼 영향 |

**P0 + Fix Cost 예시 (Static Triaging)**

| ID | Sev | Blocker | Repro | Fix Cost | 비고 |
|----|-----|---------|-------|----------|------|
| ISSUE-002 | P0 | ✅ | 100% | **S** | markAllRead 조건 제거 |
| ISSUE-001 | P0 | ✅ | 100% | **L** | local-home userId 스코프 |
| ISSUE-004 | P0 | ✅ | 100% | **XL** | RTDN 인증 아키텍처 |

---

## 2. Repro Rate · Evidence (재현성)

**Backlog 품질 > 양.** Day 1 우선순위는 Severity + Blocker + **Repro + Evidence**로 결정.

### Repro Rate

`Frequency`와 동일 개념 — Master Table에는 **%**로 표기.

| Repro Rate | Frequency | 의미 |
|------------|-----------|------|
| **100%** | Always | 3회 중 3회 |
| **70%** | Often | 3회 중 2회 |
| **30%** | Rare | 조건부 |
| **Unknown** | One-time | 미재현·1회만 |

### Evidence (필수 1개 이상)

| Evidence | 용도 |
|----------|------|
| **Screenshot** | 레이아웃 · Empty · 간격 |
| **Recording** | 애니메이션 · 로딩 · 피드백 타이밍 |
| **Log** | 서버/클라이언트 에러 (ISSUE-003, 004) |
| **Crash** | 스택트레이스 |
| **Network** | API 실패 · timeout · offline |
| **Static** | 코드 감사만 (User 실기기 재확인 전) |

**예시**

| ID | Sev | Blocker | Repro | Evidence |
|----|-----|---------|-------|----------|
| ISSUE-004 | P0 | ✅ | 100% | Log + Static |
| ISSUE-018 | P1 | ✅ | 100% | Recording (User) |
| UXD-021 | P3 | ❌ | 30% | Screenshot |

### 필수 기록 필드 (ISSUE)

```
Repro Rate: 100% | 70% | 30% | Unknown
Evidence: Screenshot | Recording | Log | Crash | Network (복수 가능)
Platform: Web | Android | Tablet(Fold)
Build: RC2-___
Condition: (30% / Unknown 시)
```

---

## 3. Frequency (레거시 — Repro Rate와 동일)

```
Frequency: Always | Often | Rare | One-time
Platform: Web | Android | iOS | Tablet(Fold)
Build: RC2-001 (또는 commit short hash)
Condition: (Rare/One-time일 때) 예: Offline → Online 전환 시만
```

### 예시

```
ISSUE-023
Summary: Toast가 안 보임
Severity: P1
Frequency: Always
Platform: Android
Build: RC2-001
Condition: —
```

```
ISSUE-044
Summary: 레이아웃 1프레임 깜빡임
Severity: P2
Frequency: Rare
Platform: Web
Build: RC2-001
Condition: 로그아웃 → 재접속 직후만
```

**Triaging 규칙**

| Frequency | P1 이상 | P2 | P3 |
|-----------|---------|-----|-----|
| Always | Day 1 | Day 2 | Day 3~5 |
| Often | Day 1~2 | Day 2~3 | Backlog |
| Rare | 조건 재현 후 P 재평가 | Day 3 | Won't Fix 후보 |
| One-time | 재현 시도 1회 더 → 재분류 | 관찰 | Won't Fix 후보 |

---

## 3. Won't Fix

RC에서 **모든 항목을 고치면 끝이 없다.** 수정하지 않기로 한 항목은 반드시 문서화.

### Status 값

| Status | 의미 |
|--------|------|
| `Open` | 미처리 |
| `In Progress` | 작업 중 |
| `Fixed` | 수정 완료 |
| `Won't Fix` | RC 범위에서 수정 안 함 (사유 필수) |
| `Deferred` | RC 이후 Sprint로 이연 |

### Won't Fix 필수 필드

```
Status: Won't Fix
Won't Fix Reason: (한 줄)
Review After: RC Sprint 3 | Post-Launch | Never
```

### 예시

```
UXD-041
Summary: 아이콘 위치 2px
Severity: P3
Status: Won't Fix
Won't Fix Reason: 시각 영향 미미, Style Lock 범위 외
Review After: Post-Launch
```

```
ISSUE-077
Summary: iPad Landscape 1px 밀림
Severity: P3
Frequency: Rare
Status: Won't Fix
Won't Fix Reason: 타깃 디바이스 아님 (Phone-first RC)
Review After: RC Sprint 3
```

**Lock 시:** 모든 `Open` P2/P3/UXD는 `Fixed` · `Won't Fix` · `Deferred` 중 하나여야 한다.

---

## 4. Day 0 산출물 기준

**현재 진행률: ~45–50%** (Static만 완료, Gate 미통과)

### Gate 체크리스트

| 항목 | 상태 | 우선순위 |
|------|------|----------|
| Static Audit 55건 | ✅ | — |
| Backlog Owner/Sprint/Blocker | ✅ | — |
| 코드 수정 금지 | ✅ | — |
| **Persona 1** (8단계, 웹→Android) | ❌ | **1** |
| Persona 2 | ❌ | 2 |
| Android (Safe Area·Resume·Splash…) | ❌ | **2** |
| Screenshot 30~50 · Recording 7 | ❌ | 1~2 |
| Backlog 80~120건 | ❌ (55) | 1~2 |
| economy:stress | ⚠️ | **3 (마지막)** |

### Persona 1 — 최우선 8단계

```
설치 → 회원가입 → 튜토리얼 → 첫 집 → 첫 가구 → 첫 저장 → 앱 종료 → 재접속
```

관찰: 멈춤 · 빈 화면 · 로딩 · 애니메이션 · 버튼 · 설명 부족 → ISSUE/UXD

### Backlog

| 항목 | 이상적 | 최소 | 너무 적으면 |
|------|--------|------|------------|
| **ISSUE** | ~100 | 50 | 테스트가 얕았을 가능성 |
| **UX Debt** | ~40 | 20 | UX 관찰이 부족 |

### Screenshot

플랫폼별 `docs/sprint2-audit/` 하위:

| 플랫폼 | 경로 | 목표 |
|--------|------|------|
| Web | `web/` | 10~20장 |
| Android | `android/` | 10~20장 |
| Tablet (Fold) | `tablet/` | 5~10장 |
| **합계** | | **30~50장** |

### Screen Recording (스크린샷보다 중요)

`docs/sprint2-audit/recordings/` — 애니메이션·로딩·피드백은 영상에서만 드러나는 경우가 많음.

| # | 장면 | 필수 |
|---|------|------|
| 1 | 첫 실행 | ✅ |
| 2 | 첫 집 진입 (First Entry) | ✅ |
| 3 | 가구 배치 (편집 → 저장) | ✅ |
| 4 | 장터 등록/구매 | ✅ |
| 5 | Live 보상 | ✅ |
| 6 | IAP 구매 (Day 4 Android) | ✅ |
| 7 | 로그아웃 → 재접속 | ✅ |

파일명 예: `web-persona1-first-entry.mp4`, `android-persona1-furniture-place.mp4`

---

## 5. Day 1 착수 순서 (Gate 통과 후)

```
1. P0 Blocker + Fix Cost S/M     ← 빠른 Blocker 감소
2. P0 Blocker + Fix Cost L/XL
3. P1 (Blocker → 나머지)
4. Regression (Blocker ✅ 전부 Fixed 확인)
5. P2
6. Motion · Empty · Skeleton     ← Backlog 기반, Blocker 정리 후
```

**금지:** Gate 전 Motion/Skeleton/Empty 선제작 · Gate 후 Blocker 미해결 시 UX Polish 착수

## 6. Sprint 2 Lock 기준 (Day 5)

감이 아니라 **숫자**로 판단.

| 항목 | 목표 |
|------|------|
| P0 | **0** |
| P1 | **0** |
| **Release Blocker ✅ (Open)** | **0** |
| P2 (Open) | **5 이하** (나머지 Fixed / Won't Fix / Deferred) |
| P3 (Open) | **20 이하** |
| UX Debt (Open) | **10 이하** 또는 전부 일정 배정(Deferred) |
| Persona 1 | **PASS** |
| Persona 2 | **PASS** |
| Persona 3 | **PASS** |
| Persona 4 | **PASS** |
| Android 실기기 | **PASS** |
| 회귀 테스트 (Day 5) | **PASS** |

### Lock 체크리스트

- [ ] Backlog P0/P1 = 0
- [ ] P2 Open ≤ 5, P3 Open ≤ 20
- [ ] UXD Open ≤ 10 또는 Deferred 문서화
- [ ] 모든 Won't Fix에 Reason + Review After
- [ ] Persona 1~4 ([RELEASE_QA.md](./RELEASE_QA.md)) 전 step Pass
- [ ] Screen Recording 7종 확보
- [ ] Motion Bible Lock (`RC_SPRINT_2_MOTION_BIBLE.md`)

---

## 관련 문서

- [RC_SPRINT_2_AUDIT.md](./RC_SPRINT_2_AUDIT.md) — Day 0 실행
- [RC_SPRINT_2_BACKLOG.md](./RC_SPRINT_2_BACKLOG.md) — 이슈 목록
- [RC_SPRINT_2_UX_VALIDATION.md](./RC_SPRINT_2_UX_VALIDATION.md) — Sprint 일정
