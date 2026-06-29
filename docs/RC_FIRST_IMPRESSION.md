# RC-A — First Impression Polish

**목표:** 설치 후 첫 집 진입 **0~5초** 안에 “귀엽다 / 분위기 좋다”는 인상을 준다.

경제·운영 기능이 아니라 **유저가 처음 보는 5초**가 이번 스프린트의 범위다.

---

## Phase 우선순위

| Phase | 이름 | 우선순위 | 상태 |
|-------|------|----------|------|
| A-1 | First Entry Experience | ★★★★★ | ✅ 완료 |
| A-2 | Lighting + Material | ★★★★★ | ✅ Bible 적용 (코너 GLB는 A-3) |
| A-3 | Living Corner Sample (6종) | ★★★★★ | ✅ 레이아웃 Lock (WebP Art Pass 남음) |
| A-4 | Story Layer | ★★★★☆ | 대기 |
| A-5 | Micro Interaction | ★★★★☆ | 대기 |

---

## A-1 시퀀스

```
Loading (warm cream)
    ↓
Dollhouse Reveal (camera ease-in, opacity)
    ↓
Dwell (집 전체 한 박자)
    ↓
Living Room enter (거실 자동 진입)
    ↓
UI Fade (HUD · Nav)
    ↓
Ambient (은은한 패드)
```

**스킵:** 탭 한 번 → 거실 + UI 즉시 표시 (`localStorage`에 완료 기록)

**재생 (QA):** `?replayIntro=1` 또는 `sessionStorage.removeItem('apt-first-impression-v1')`

---

## Definition of Done

### First Impression (A-1)

- [ ] 첫 진입 시 로딩 → 돌하우스 reveal → 거실 → UI 순서가 **끊김 없이** 재생된다
- [ ] 전체 시퀀스 **≤ 5초** (스킵 제외)
- [ ] 재방문 유저는 intro **스킵** (`apt-first-impression-v1`)
- [ ] 방문(친구 집) 모드에서는 intro **비활성**
- [ ] 탭으로 **스킵** 가능
- [ ] 은은한 ambient 패드 (음소거/저전력 환경에서 크래시 없음)

### Style Lock (A-3)

- [ ] Living Corner 6종(Sofa · Table · Rug · Lamp · Plant · TV)이 **동일 스타일 언어** 공유
- [ ] `APT_STYLE_LOCK.md` 수치 승인
- [ ] Corner Sample 6/6 Gate 통과

### Visual Consistency (A-2)

- [ ] 벽 · 러그 · 나무 · 패브릭 · 그림자가 **한 세계**처럼 보임
- [ ] Key / Fill / AO / Exposure가 Art Bible §②와 일치

### Interaction Polish (A-5)

- [ ] 가구 배치 Pop · Snap · Haptic · Sound 피드백
- [ ] 방 전환 애니메이션이 끊기지 않음

### Performance

- [ ] 첫 집 진입 **≤ 0.5s** (씬 ready, intro 제외) — 측정: Performance API mark `apt-interior-ready`
- [ ] 60fps 유지 (중급 Android 기준)

---

## 측정 방법

1. **시간:** Chrome DevTools Performance · `performance.mark('apt-first-entry-start')` ~ `apt-interior-ready`
2. **감성:** 5명 blind test — 레퍼런스 없이 “Bondee 같다” **3/5 이상**
3. **회귀:** `docs/RELEASE_QA.md` Persona 1 시나리오 통과

---

## 비범위 (이번 스프린트)

- 새 경제 기능
- `/admin/release` 대시보드
- Play Console IAP 실기기 검증 (별도 트랙)
