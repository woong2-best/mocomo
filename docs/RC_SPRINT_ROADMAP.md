# RC Sprint Roadmap

**프로젝트 단계:** Feature Development → **Release Candidate**

RC 단계에서는 0.5~1일짜리 Phase가 아니라 **3~7일짜리 Sprint** 단위로 작업한다.

```
Phase (기능 개발)
    ↓
Sprint (RC 품질)
    ↓
Release Candidate
```

---

## Sprint 워크플로

모든 RC Sprint는 동일한 흐름을 따른다.

```
Planning
    ↓
Art / UX / Code
    ↓
QA
    ↓
실기기 검증
    ↓
수정
    ↓
Lock
```

Sprint 중간에 "다음 단계 할까요?"로 끊지 않는다. **Sprint 범위 전체를 완료한 뒤 한 번에 결과를 보고**한다.

---

## Sprint 개요

| Sprint | 제목 | 기간 | 목표 한 줄 |
|--------|------|------|-----------|
| **RC Sprint 1** ✅ | Living Room Style Lock | 3~5일 | 거실 하나만 봐도 서비스 퀄리티를 대표 |
| **RC Sprint 2** | Complete User Experience Validation | 5~7일 | 실제 사람이 하루 동안 써도 문제 없는 앱 |
| **RC Sprint 3** | Performance & Stability | 5~7일 | 60fps · LCP <1.5s · Memory <300MB |
| **RC Sprint 4** | Security & Release Ops | 5~7일 | OWASP · IAP 실기기 · `/admin/release` |

상세: 각 Sprint 문서 참조.

---

## RC Sprint 1 — Living Room Style Lock ✅

**상태:** 완료  
**문서:** [RC_SPRINT_1_LIVING_ROOM_STYLE_LOCK.md](./RC_SPRINT_1_LIVING_ROOM_STYLE_LOCK.md) · [RC_SPRINT_1_QA.md](./RC_SPRINT_1_QA.md)

- Layout · Camera · Material · Lighting · Story Layer · Ambient Animation
- Art Pass · Screenshot Pass · Style Lock 수치 문서화

---

## RC Sprint 2 — Complete User Experience Validation

**목표:** *"실제 사람이 하루 동안 써도 문제가 없는 앱"*

**운영:** Audit-First — Day 0 Persona 감사 → Issue 50~150 → Triaging → 이슈 기반 구현 (코드 선행 X)

| # | 영역 |
|---|------|
| 0 | **Day 0** Persona Audit · Issue · UX Debt 수집 |
| 1 | Persona E2E (RELEASE_QA 전 step) |
| 2 | UX Polish (audit 기반) |
| 3 | Empty State (실제 필요 화면만) |
| 4 | Error State + Retry |
| 5 | Skeleton (0.4s+ 대기만) |
| 6 | Motion System (이슈에서 도출한 토큰) |
| 7 | QA Fix |

**문서:** [RC_SPRINT_2_AUDIT.md](./RC_SPRINT_2_AUDIT.md) · [RC_SPRINT_2_BACKLOG.md](./RC_SPRINT_2_BACKLOG.md) · [RC_SPRINT_2_QA_STANDARDS.md](./RC_SPRINT_2_QA_STANDARDS.md) · [RC_SPRINT_2_UX_VALIDATION.md](./RC_SPRINT_2_UX_VALIDATION.md)

---

## RC Sprint 3 — Performance & Stability

**목표:** Apartment 체감 성능을 출시 기준에 맞춘다.

| 영역 | 항목 |
|------|------|
| Bundle | 코드 스플릿 · tree-shake · 중복 제거 |
| Assets | WebP · GLB · lazy load · cache |
| React | Suspense · memo · virtualization |
| 3D | Texture · GPU · FPS 모니터 |
| Web Vitals | LCP · CLS · TTI |

**목표 수치:**

| 지표 | 목표 |
|------|------|
| FPS (Apartment) | 60fps 유지 |
| Memory | < 300MB |
| LCP | < 1.5s |
| Room enter | < 250ms |
| First Paint | < 1s |

---

## RC Sprint 4 — Security & Release Ops

**목표:** 출시 운영 가능 상태 + 보안 검증 완료.

| 영역 | 항목 |
|------|------|
| OWASP | Rate limit · Replay · JWT · Cookie · CSRF · XSS · SQL |
| IAP | 실기기 구매 · 복원 · 환불 · Fraud |
| Ops | Logging · Monitoring |
| Dashboard | `/admin/release` (health · canary · flags · audit) |

---

## RC 종료 조건 (Release Gate)

기능 추가를 멈추고 아래 **전부** 통과해야 Production 진입.

| 항목 | 목표 |
|------|------|
| Critical Bug | 0 |
| High Bug | 0 |
| Crash-Free Session | 99.9%+ |
| Apartment 첫 진입 | 1초 이내 (체감) |
| 방 전환 | 250ms 이하 |
| FPS | 60fps 유지 |
| IAP | 실기기 구매/복원/환불 검증 완료 |
| Stress Test | 1000명+ PASS (`npm run economy:stress:1000`) |
| Release QA Persona | 4개 모두 PASS |
| 디자인 Style Lock | Living Room + 주요 공간 완료 |
| 운영 도구 | Backup · Canary · Health · Audit 정상 |

---

## 현재 완성도 (2026-06 기준)

| 영역 | % | 비고 |
|------|---|------|
| 경제/운영 시스템 | ~99% | stress · fraud · backup 완료 |
| 관리자/CS 도구 | ~99% | audit · replay · flags |
| IAP 서버 구조 | ~95% | 실기기 Closed Testing 잔여 |
| Apartment UX/비주얼 | ~80–85% | Sprint 1 거실 완료, 나머지 공간·UX 잔여 |
| 출시 준비도 (RC) | ~88–90% | Sprint 2~4 후 95%+ 목표 |

**남은 최대 가치:** 새 기능 추가보다 **유저가 실제로 느끼는 품질**을 끝까지 끌어올리는 것.

---

## 관련 문서

| 문서 | 용도 |
|------|------|
| [RELEASE_QA.md](./RELEASE_QA.md) | Persona 1~4 E2E 시나리오 |
| [RC_FIRST_IMPRESSION.md](./RC_FIRST_IMPRESSION.md) | First Entry DoD |
| [BONDEE_STYLE_BIBLE.md](./BONDEE_STYLE_BIBLE.md) | Material · Lighting |
| [RC_SPRINT_1_LIVING_ROOM_STYLE_LOCK.md](./RC_SPRINT_1_LIVING_ROOM_STYLE_LOCK.md) | 거실 Style Lock |
