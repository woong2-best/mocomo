# APT Asset Acquisition Strategy

**목적:** 수십 개 GLB를 **어떻게·누가·어떤 경로로** 확보할지 결정한다.  
**상태:** 전략안 (Hybrid 추천) · **오너 승인 대기**

> 코드·Blender·Placeholder **이전**에 이 전략을 확정한다.

**관련:** [`APT_STYLE_LOCK.md`](./APT_STYLE_LOCK.md) · [`APT_ASSET_GATE.md`](./APT_ASSET_GATE.md)

---

## 왜 전략이 먼저인가

| 사실 | 함의 |
|------|------|
| 필요 에셋 **수십 개** (4방 + 가구 + 고정 설비) | Cursor/Blender로 하나씩 전량 제작 = **수개월** |
| 참고 퀄리티 = **전문 GLB + 통일 아트** | Three.js 교체만으로 불가 |
| Style Lock 없이 제작 | 방마다 느낌 불일치 |

**순서:** Style Lock → Corner Sample → Asset Gate → 확장 → (그때) 엔진 연결

---

## 확보 경로 4가지

| # | 경로 | 장점 | 단점 | 적합 |
|---|------|------|------|------|
| 1 | **직접 Blender** | 스타일 100% 일치 | 시간 최대 | Shell, 핵심 hero, 수정 |
| 2 | **구매 GLB + 통일 수정** | 속도 | 스타일 맞춤 작업 필요 | 가구 bulk |
| 3 | **AI 생성 + 수정** | 프로토타입 빠름 | 편차 큼, 후작업 필수 | 탐색용 only |
| 4 | **외주** | 최고 품질 가능 | 비용 | Corner Sample, hero set |

---

## 추천: Hybrid (속도 × 품질)

| 카테고리 | 경로 | 이유 |
|----------|------|------|
| **Corner Sample (CS-01~06)** | 직접 **or** 외주 1회 | Style Lock 검증 — 품질 최우선 |
| **방 Shell (4 modules)** | 직접 Blender | cutaway·몰딩·창 깊이 — 구매품 rarely fits |
| **Hero 가구** (소파, 침대, dining) | 구매 후 Style Lock 수정 **or** 외주 | 반복 labor 절약 |
| **Bulk 소품** (화분, 램프, 쿠션) | 구매 + batch material override | 형태 다양, 스펙 단순 |
| **Kitchen/Bath fixtures** | 구매 kit + scale/bevel pass | 모델링 시간 절약 |
| **AI mesh** | **Style Lock 승인 전 사용 금지** | Corner Sample 확정 후 보조만 |

### Hybrid 원칙

1. **모든 경로의 산출물**은 Style Lock § 전역 상수 통과
2. 구매/AI 에셋은 **그대로 쓰지 않음** — bevel, scale, material, color 반드시 pass
3. Asset Gate 미통과 에셋은 `public/apt/glb/`에 넣지 않음

---

## 에셋 인벤토리 (전체 — Corner Sample 이후 확장)

### Phase 0 — Corner Sample (Style 검증)

| ID | 에셋 | 경로(안) |
|----|------|----------|
| CS-01 | Corner shell | 직접 |
| CS-02 | Sofa | 직접 or 외주 |
| CS-03 | Rug | 직접 or 구매+수정 |
| CS-04 | Coffee table | 구매+수정 |
| CS-05 | Plant | 구매+수정 |
| CS-06 | Floor lamp | 구매+수정 |

### Phase 1 — 거실·주방 visible

sofa ✓, coffee_table ✓, tv_stand, tv, rug ✓, plant ✓, floor_lamp ✓, dining_table, chair×2, kitchen_run, fridge

### Phase 2 — 침실×2

bed×2, nightstand, wardrobe, desk, chair, bookshelf, rug

### Phase 3 — 욕실

toilet, sink, shower, mirror, shelf

### Phase 4 — Shop variants

색상 variant only — form language 변경 금지

**Phase 1~4는 Phase 0 Style Gate + Asset Gate 통과 후 착수.**

---

## 구매 소스 (조사 후 확정)

아래는 **후보 유형**이며, Style Lock pass 가능 여부는 개별 검수.

| 유형 | 예시 플랫폼 | 검수 포인트 |
|------|-------------|-------------|
| Low-poly cozy furniture | Sketchfab, CGTrader | bevel·scale 수정 가능성 |
| Architectural interiors | TurboSquid | shell 분리 가능성 |
| **금지:** photoreal scan, sharp CAD | — | Style Lock 위반 |

구매 전 **CS-02 sofa 1개 trial** → Style Lock pass 여부 확인 → bulk 구매.

---

## AI 생성 정책

| 허용 | 금지 |
|------|------|
| Style Lock **승인 후** blockout 참고 | Corner Sample 전 AI mesh |
| 수동 bevel + retopo + Style Lock material | AI output 그대로 Asset Gate 제출 |

---

## 외주 브리프 (필요 시)

외주사에 전달:

1. `public/apt/reference/apt-target-mockup.png`
2. `docs/APT_STYLE_LOCK.md` (CS-02~06 스펙)
3. `docs/APT_ASSET_GATE.md` 체크리스트
4. Deliverable: `.glb` + source `.blend` + render still (mockup 비교용)

**Deliverable 없이 "완료" 선언 불가.**

---

## 비용·일정 (오너 입력 필요)

| 항목 | 옵션 A | 옵션 B |
|------|--------|--------|
| Corner Sample | 내부 Blender | 외주 ~$___ |
| Phase 1 bulk | 구매 $___ + 수정 | 외주 pack |
| 일정 목표 | Style Gate: ___주 | Full apt: ___개월 |

> **오너 결정 필요:** Corner Sample 제작 주체 (내부 / 외주 / 혼합)

---

## Cursor(엔진) 역할 — 에셋 확정 후

| 할 일 | 안 할 일 |
|-------|----------|
| Asset Gate 통과 GLB 로드 | Gate 전 procedural 연결 |
| Art Bible §② lighting rig | Gate 전 feature 코드 |
| Camera state machine | Gate 전 shop catalog 확장 |
| mockup 비교 캡처 스크립트 | Placeholder / Shell hack |

---

## 결정 체크리스트 (오너)

- [ ] Hybrid 전략 승인
- [ ] Corner Sample 제작 주체: ☐ 내부  ☐ 외주  ☐ 혼합
- [ ] 구매 예산 상한: _______
- [ ] 외주 예산 상한: _______
- [ ] Style Lock 문서 승인 (`APT_STYLE_LOCK.md`)
- [ ] AI 보조 사용: ☐ 승인(Style Lock 후)  ☐ 금지

**위 체크 전:** Blender template · Placeholder Shell · 추가 렌더 코드 **착수 금지**

---

*Last updated: 2026-06-27*
