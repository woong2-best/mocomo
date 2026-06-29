# RC Sprint 2 — Complete User Experience Validation

**기간:** 5~7일  
**목표:** *"실제 사람이 하루 동안 써도 문제가 없는 앱"*

**선행:** RC Sprint 1 (Living Room Style Lock) 완료

**핵심 원칙:** 코드부터 만들지 않는다. **Persona Audit → Issue 수집 → Triaging → 이슈 기반 구현.**

---

## Sprint 일정 (Audit-First)

```
DAY 0   Persona Audit (진행 중 ~50%) → Gate 통과 전 코드 금지
        Priority: ① Persona 1 8단계  ② Android  ③ Stress (마지막)

DAY 1   Gate 후: P0 Blocker S/M → P0 L/XL → P1 → Regression → P2 → Motion/Empty/Skeleton

DAY 2   P2 잔여 · Motion Bible · Empty · Skeleton (이슈 기반)

DAY 3   Bug Fix · Haptic · Sound

DAY 4   Android 재검 · IAP 실기기

DAY 5   Regression QA · Lock
```

| Day | 문서 |
|-----|------|
| 0 | [RC_SPRINT_2_AUDIT.md](./RC_SPRINT_2_AUDIT.md) · [RC_SPRINT_2_BACKLOG.md](./RC_SPRINT_2_BACKLOG.md) · [RC_SPRINT_2_QA_STANDARDS.md](./RC_SPRINT_2_QA_STANDARDS.md) |
| 1~2 | Motion Bible · Empty/Error 컴포넌트 (이슈 목록 기반) |
| 5 | [RELEASE_QA.md](./RELEASE_QA.md) 전체 Pass |

---

## Day 0 — Persona Audit (User 주도)

**Gate 미통과 — Cursor 코드 수정 대기**

### 우선순위

1. **Persona 1** — 8단계 (웹 → Android)
2. **Android** — Safe Area · Keyboard · 뒤로가기 · Gesture · StatusBar · Splash · Resume
3. **Persona 2**
4. **Stress** — 마지막 (UX 먼저가 RC에서 효율적)

1. Persona 1 웹 + Android 8단계 완주
2. Persona 2
3. 스크린샷 30~50 · Recording 7
4. Backlog 80~120건 · P0/P1 Blocker 확정
5. **Gate 통과 → Day 1**

**상세:** [RC_SPRINT_2_AUDIT.md](./RC_SPRINT_2_AUDIT.md)

---

## Day 1 — Motion · Empty · Error (이슈 기반)

### Motion Bible

Audit에서 나온 duration/curve 불만을 토큰으로 통일. **선제 정의 금지** — Day 0 이슈 반영 후 Lock.

| Token (예시) | Value | 용도 |
|--------------|-------|------|
| `fast` | 180ms | button press |
| `normal` | 260ms | sheet, toast |
| `slow` | 420ms | room transition |
| `hero` | 900ms | first entry camera |

| Curve | 용도 |
|-------|------|
| `easeOut` | enter |
| `spring` | sheet |
| `bounce` | reward (필요 시만) |

산출물: `src/lib/apt/motion/motion-tokens.ts` · `docs/RC_SPRINT_2_MOTION_BIBLE.md`

### Empty State

Day 0 `Empty` 카테고리에 **실제 등장한 화면만** 구현 (예: 친구 없음 5개 vs 방문 기록 7개 — audit 결과 따름).

### Error State

Day 0 `Error` 카테고리 + Retry 필요 여부 확정 후 구현.

---

## Day 2 — Skeleton · Feedback

### Skeleton

**0.4초 이상** 빈 화면이 측정된 구간만. 불필요한 Skeleton 추가하지 않음.

### Haptic · Sound · Animation

Audit `Haptic` / `Sound` / `Motion` 이슈 우선순위대로.

---

## Day 3 — Bug Fix

- P0/P1: Sprint 중 발견 즉시 수정
- Day 3: Medium/Low 일괄 처리
- 목표: Critical 0 · High 0 · Medium < 5 · Low < 20

---

## Day 4 — Android 실기기

- Persona 1~2 재검 (웹과 diff 기록)
- IAP: 구매 · 복원 · 환불 ([RELEASE_QA.md](./RELEASE_QA.md) 2.10~2.11, 3.7)

---

## Day 5 — Regression QA

- Persona 1~4 전 step 재실행
- Backlog Lock checklist
- RC Sprint 2 Lock

---

## UX Debt 관리

버그(`ISSUE`)와 별도로 **사용성 부채(`UXD`)** 추적.

| ID | Current | Target |
|----|---------|--------|
| UXD-014 | Toast 상단 | Bottom center |
| UXD-022 | Spinner | Skeleton |

전체 목록: [RC_SPRINT_2_BACKLOG.md](./RC_SPRINT_2_BACKLOG.md)

---

## Persona E2E 참조

[RELEASE_QA.md](./RELEASE_QA.md) — Persona 1 (1.1~1.13) · 2 (2.1~2.11) · 3 (3.1~3.7) · 4 (4.1~4.9)

자동화 (Day 0):

```bash
npm run economy:stress:1000
npm run economy:fraud-scan
```

---

## Sprint 2 DoD (Lock — 숫자 기준)

→ 전체 표: [RC_SPRINT_2_QA_STANDARDS.md](./RC_SPRINT_2_QA_STANDARDS.md#5-sprint-2-lock-기준-day-5)

| 항목 | 목표 |
|------|------|
| P0 / P1 | 0 |
| P2 Open | ≤ 5 |
| P3 Open | ≤ 20 |
| UX Debt Open | ≤ 10 또는 Deferred |
| Persona 1~4 | PASS |
| Android 실기기 | PASS |
| Recording 7종 | 확보 |
| Day 5 Regression | PASS |

- [ ] Day 0: ISSUE ~100 · UXD ~40 · Screenshot 30~50 · Recording 7
- [ ] Motion Bible Lock (이슈 기반)
- [ ] Empty/Error/Skeleton — audit 항목만 구현
- [ ] 모든 Won't Fix에 Reason + Review After

---

## 관련 문서

- [RC_SPRINT_ROADMAP.md](./RC_SPRINT_ROADMAP.md)
- [RC_SPRINT_2_AUDIT.md](./RC_SPRINT_2_AUDIT.md) — Day 0 런북
- [RC_SPRINT_2_BACKLOG.md](./RC_SPRINT_2_BACKLOG.md) — Issue · UX Debt
- [RELEASE_QA.md](./RELEASE_QA.md)
