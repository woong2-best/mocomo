# RC Sprint 2 — Backlog

**상태:** Day 1 — P0/P1 Blocker 코드 수정 완료 · Persona 스모크 스크립트 추가 · 실기기 **User 대기**  
**규칙:** Motion · Skeleton · Empty · Error · Haptic 등 UXD는 코드 일부 반영 (`6f00790` 이후)

**감사 가이드:** [RC_SPRINT_2_AUDIT.md](./RC_SPRINT_2_AUDIT.md)  
**기준:** [RC_SPRINT_2_QA_STANDARDS.md](./RC_SPRINT_2_QA_STANDARDS.md)

**Day 0 Gate:** **미통과** (~55–60% 진행) — 실기기 Persona · 녹화 · Stress PASS 튜닝 후 Day 1 착수

| Gate 항목 | 상태 |
|-----------|------|
| Static Audit (55건) | ✅ |
| Backlog 구조 (Owner/Sprint/Blocker) | ✅ |
| P0/P1 Blocker 코드 | ✅ **Fixed** (001–005, 006–007 부분, 008–009, 012, 018) |
| Persona 1 웹 스모크 (`npm run persona:smoke`) | ⚠️ 6장 자동 캡처 (`docs/sprint2-audit/web/`) |
| Persona 1 실사용 (웹+Android 로그인) | ❌ **최우선** |
| Persona 2 | ❌ |
| Android 실기기 (Safe Area·Resume 등) | ❌ **Priority 2** |
| Screenshot 30~50 / Recording 7 | ⚠️ 6/30 (자동) |
| economy:stress | ⚠️ quick WARN (무결성·Fraud PASS, P95 튜닝) |
| economy:fraud-scan | ✅ `npm run economy:fraud-scan` (200명 배치) |

**Gate 통과 조건 (8개 전부):** Persona1 웹·Android · Persona2 · Screenshot 30+ · Recording 7 · Backlog 80~120 · Blocker 확정 · Stress PASS 또는 원인 분석

---

## Triaging Summary

| Severity | Count | Lock 목표 | Day 착수 |
|----------|------:|----------:|----------|
| **P0** | 4 | 0 | 즉시 |
| **P1** | 13 | 0 | Day 1 |
| **P2** | 27 | ≤5 Open | Day 2~3 |
| **P3** | 11 | ≤20 Open | Sprint 마지막 |
| **UX Debt** | 39 | ≤10 Open | Day 1~2 |
| **Total ISSUE** | **55** | | 목표 ~100 (User 실기기로 보강) |

### Status

| Status | Count |
|--------|------:|
| Open | ~44 |
| Fixed | ~11 |
| Won't Fix | 0 |
| Deferred | 0 |

### Owner · Sprint (요약)

| Owner | Open | Sprint 2 | Sprint 3+ |
|-------|-----:|---------:|----------:|
| **Cursor** | 55 | 42 | 13 |
| **User** | — | 실기기 검증·영상·P0 재현 | — |

---

### Release Blocker

출시를 **막아야 하는지** Severity와 별도 판단. P2라도 Blocker ✅일 수 있고, P1이라도 ❌ + Deferred 가능.

| Blocker | 의미 |
|---------|------|
| **✅** | RC 출시 전 **반드시** Fixed. Day 1 최우선 |
| **❌** | Sprint 2 내 또는 RC 이후 처리 가능 |

## Master Table

| ID | Sev | Blocker | Repro | Evidence | Fix | Status | Owner | Sprint | Summary |
|----|-----|---------|-------|----------|-----|--------|-------|--------|---------|
| ISSUE-001 | P0 | ✅ | 100% | Static | **L** | **Fixed** | Cursor | S2 | local-home 계정 전환 데이터 잔존 |
| ISSUE-002 | P0 | ✅ | 100% | Static | **S** | **Fixed** | Cursor | S2 | 알림 탭=전체 읽음 |
| ISSUE-003 | P0 | ✅ | 70% | Static+Log | **M** | **Fixed** | Cursor | S2 | 5000G 폴백 → Error/Retry |
| ISSUE-004 | P0 | ✅ | 100% | Static+Log | **XL** | **Fixed** | Cursor | S2 | **최상위** RTDN 무인증 |
| ISSUE-005 | P1 | ✅ | 70% | Static | **M** | **Fixed** | Cursor | S2 | offline sync 킬스위치 우회 |
| ISSUE-006 | P1 | ✅ | 70% | Static | **M** | **Fixed** | Cursor | S2 | 장터 wash — 거래 시 24h 역구매 차단 |
| ISSUE-007 | P1 | ✅ | 70% | Static | **S** | **Fixed** | Cursor | S2 | market 구매 후 fraud risk 재계산 |
| ISSUE-008 | P1 | ✅ | 100% | Static | **M** | **Fixed** | Cursor | S2 | IAP 환불 gem 부족 시 gold clawback |
| ISSUE-009 | P1 | ✅ | 100% | Static | **S** | **Fixed** | Cursor | S2 | prod IAP dev verify 차단 |
| ISSUE-012 | P1 | ✅ | 70% | Static | **S** | **Fixed** | Cursor | S2 | signup→`/play/house` 딥링크 |
| ISSUE-018 | P1 | ✅ | 100% | Static | **M** | **Fixed** | Cursor | S2 | logout 로컬 미정리 |

_나머지 49건( ISSUE-006~030, UXD-001~032 ): Static 감사 — Triaging 시 Repro/Evidence/Blocker 채움. 상세는 Day 0 Persona Audit에서 보강._

---

## 이슈 제출 템플릿 (Persona Audit용)

```
ID: ISSUE-___ 또는 UXD-___
Severity: P0|P1|P2|P3
Release Blocker: ✅|❌
Repro Rate: 100%|70%|30%|Unknown
Evidence: Screenshot|Recording|Log|Crash|Network
Fix Cost: S|M|L|XL
Platform: Web|Android
Build: RC2-___
Persona: 1|2
Screen:
Expected:
Actual:
Timing: T1~T5 (해당 시)
Notes:
```

**Triaging 검토 항목 (7):** Severity · Blocker · Repro · Evidence · Root Cause · Fix Cost · Sprint

**P0 남용 금지:** 데이터/보안/IAP/크래시/타인 데이터 노출/신뢰 훼손에 해당할 때만 P0.

---

## P0 — 상세 (User 실기기 재현 필수)

### ISSUE-001
```
Persona: 1, 2 | Step: 1.10, 1.12
Screen: local-home / relogin
Category: Bug
Severity: P0 | Frequency: Always | Platform: Both | Build: RC2-static-audit-001

Expected: 로그아웃·재가입 시 새 유저 집/다이오라마/경제 캐시
Actual: LOCAL_HOME_OWNER="local-home" 단일 키; meta.initialized 후 서버 seed 무시
        logout 시 local home/economy 미삭제 (ISSUE-018 연관)

Source: Static audit — local-home-store.ts, profile-menu.tsx
Owner: Cursor | Sprint: Sprint 2 | Status: Open
User Action: Android/Web 계정 A→로그아웃→계정 B 재현 + Recording
```

### ISSUE-002
```
Persona: 1 | Step: 1.11
Screen: /notifications
Category: Bug
Severity: P0 | Frequency: Always | Platform: Both

Expected: 알림 목록·읽음/안읽음·배지 유지
Actual: unreadCount>0이면 진입 즉시 markAllRead; initialUnread=0 강제

Source: notifications-list-async.tsx L14-24
Owner: Cursor | Sprint: Sprint 2 | Status: Open
User Action: 미읽음 3개 → 알림 탭 → 배지 소멸 Recording
```

### ISSUE-003
```
Persona: 1 | Step: 1.4
Screen: /apt
Category: Error
Severity: P0 | Frequency: Often | Platform: Both
Condition: getAptGameState 실패 시

Expected: 에러/재시도 UI
Actual: createDefaultGameState() 폴백 (5000G, 50💎)

Source: apt/page.tsx, apt-game-context.tsx
Owner: Cursor | Sprint: Sprint 2 | Status: Open
```

### ISSUE-004
```
Persona: 3 | Step: 3.4, 3.7
Screen: POST /api/iap/google/rtdn
Category: Security / Bug
Severity: P0 | Release Blocker: ✅ (최상위 P0) | Frequency: Always
```

Expected: Google Pub/Sub 인증 후만 void/refund
Actual: base64 decode → handleIapVoidOrRefund 무인증

Source: rtdn/route.ts — Static audit
Owner: Cursor | Sprint: Sprint 2 | Status: Open
User Action: 스테이징 보안 리뷰 (공격 시뮬레이션 금지, 설계 검토만)
```

---

## Persona 3 자동화 (Day 0)

| Script | 결과 | Notes |
|--------|------|-------|
| `npm run economy:stress` | **미완료** | Scenario 1에서 대기 (DB direct 필요) — **User 재실행** |
| `npm run economy:fraud-scan` | 미실행 | stress 완료 후 |

**User:** 스테이징 DB 연결 후 stress + fraud-scan 실행 → 결과를 ISSUE로 추가

---

## Day 0 산출물 체크

| 항목 | 목표 | 현재 | Owner |
|------|------|------|-------|
| ISSUE | ~100 | **55** (static) | Cursor ✅ / User 보강 |
| UX Debt | ~40 | **39** (표에 포함) | |
| Screenshot | 30~50 | **0** | **User** |
| Recording 7종 | 7 | **0** | **User** |
| Persona 1 실기기 | Pass | 미실행 | **User** |
| Persona 2~4 실기기 | Pass | 미실행 | **User** |

**Day 0 Gate:** User 실기기 + 80~120건 + 스크린샷/영상 + Blocker 확정 전까지 **코드 수정 금지 유지**

**Day 1 (Gate 후):** P0 Blocker **S/M** → P0 **L/XL** → P1 → Regression → P2 → Motion/Empty/Skeleton

---

## Won't Fix / Deferred

| ID | Type | Summary | Reason | Review After | Owner |
|----|------|---------|--------|--------------|-------|
| _(비어 있음)_ | | | | | |

---

## Changelog

| Date | Action | Owner |
|------|--------|-------|
| 2026-06-29 | P0/P1 Blocker 코드 수정 + stress WARN (무결성 PASS) | Cursor |
| | Persona 3 stress — DB 대기, User 재실행 필요 | User |
| | Owner/Sprint 컬럼 추가 | Cursor |
