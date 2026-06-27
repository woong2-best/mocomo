# MoCoMo APT Art Bible

**목표 레퍼런스:** Bondee / Nintendo-style cozy isometric home decoration  
**기준 이미지:** `public/apt/reference/apt-target-mockup.png` (4-panel: Overview · Home HUD · Edit Mode · Mission)  
**상태:** Art Direction 문서화 · **Style Lock 미승인** · **Corner Sample 0/6** · 코드만으로는 목표 퀄리티 불가

**작업 순서 (변경됨):**

1. [`APT_STYLE_LOCK.md`](./APT_STYLE_LOCK.md) — 아트 스타일 수치 확정  
2. [`APT_ASSET_STRATEGY.md`](./APT_ASSET_STRATEGY.md) — Hybrid 확보 전략 · 오너 승인  
3. **Corner Sample** (거실 코너 6종) — Style + Asset Gate  
4. **90% Visual Gate** — mockup 나란히 비교  
5. Phase 확장 · 엔진 연결

> Blender template · Shell placeholder **Style Lock 승인 전 금지**

> Three.js/R3F는 **렌더링 기반**일 뿐이다.  
> 이 문서의 퀄리티는 **전문 제작 GLB + 일관된 아트 디렉션 + 조명/그림자 + 카메라 연출 + UI + 애니메이션**이 함께 갖춰져야 달성된다.

---

## 0. 한 줄 정의

**“오후 햇살이 들어오는, 둥글고 따뜻한 미니어처 아파트 — Bondee 감성의 isometric dollhouse.”**

모든 방, 가구, 소품, UI는 이 한 문장과 기준 이미지에 맞춰 판단한다.

---

## ① 모델 스타일 (Model Style)

### 방향

| 원칙 | 설명 |
|------|------|
| **둥근 모서리** | 가구·문·선반·테이블 모서리 R≥ 실제 대비 과장. 날카로운 90° 엣지 금지. |
| **귀여운 비율** | 실사 1:1이 아닌 **chibi-adjacent**: 다리·등받이·쿠션 두께 약간 과장. |
| **축소 스케일** | 가구는 실제 크기 대비 **85~92%**. 공간이 답답하지 않게 “미니어처 집” 느낌. |
| **Nintendo / Bondee 감성** | Animal Crossing · Bondee · Cozy mobile life sim 톤. 장난감 같지만 저급하지 않음. |

### 형태 언어

- **실루엣:** 단순하지만 특징적 (소파 = 둥근 팔걸이 + 두툼한 쿠션, 침대 = 낮은 헤드보드 + 레이어드 bedding).
- **디테일 밀도:** 메시 하나당 **1차 형태 + 1~2개 보조 디테일** (손잡이, 스티치, 쿠션 주름). 과도한 하드-surface CAD 느낌 금지.
- **소품:** 책, 화분, 램프, 그릇 등 **독립 GLB** 또는 명확한 서브메시. 단색 박스 금지.

### GLB 제작 스펙 (가구·소품)

| 항목 | 값 |
|------|-----|
| 포맷 | glTF 2.0 / `.glb` |
| 축 | Y-up, forward -Z (Three.js 기본) |
| 스케일 | 1 unit = 1 meter (엔진에서 room grid에 맞게 스케일) |
| 폴리 | 가구 2k~8k tris · 소품 200~1.5k · 방 shell 모듈 5k~15k/방 |
| UV | 0~1 overlap 최소화, 2번째 UV(AO bake) 권장 |
| 네이밍 | `apt/{category}/{id}.glb` 예: `apt/furniture/sofa-beige-01.glb` |

### 금지 (모델)

- Procedural box/roundedBox 가구
- SVG / PNG / WebP 스프라이트 가구
- Placeholder 색상 블록
- 실사 스캔 그대로의 날카로운 엣지·과도한 디테일

---

## ② 조명 (Lighting)

### 분위기: **오후 햇살 (Late Afternoon Golden Hour)**

| 항목 | 스펙 |
|------|------|
| **색온도** | Key 5200~5800K (따뜻한 햇살) · Fill 6500K (약한 하늘 반사) · Ambient 4800K (크림 톤) |
| **Key Light** | Directional, 좌상단 ~35° elevation, ~225° azimuth (기준 이미지와 동일 방향 고정) |
| **Fill** | 반대측 약 25% intensity, cool tint |
| **Rim / Bounce** | 바닥·벽에서 올라오는 warm bounce ( hemisphere 또는 baked ) |

### 그림자

| 항목 | 스펙 |
|------|------|
| **Soft Shadow** | PCF soft shadow map, mapSize ≥ 2048 (모바일 1024 fallback) |
| **Contact** | 가구 다리·벽 모서리 **contact shadow** (AO 또는 decal) |
| **Ambient Occlusion** | 벽-바닥 코너, 가구 아래, 선반 깊이 — **SSAO 또는 baked AO map** 필수 |

### 후처리

- Tone mapping: ACES Filmic, exposure 1.0~1.15
- Subtle bloom **금지** (과한 glow X)
- Vignette: 씬 가장자리 5~8% only (UI 레이어와 분리)

### 참고 팔레트 (조명 반응)

```
Key warm:     #FFF4E6
Floor bounce: #F5E6D3
Shadow core:  #3D3228 @ 40% opacity (soft, not black)
Sky fill:     #E8F0FF @ 15%
```

---

## ③ 재질 (Materials)

**목표: 중간 — 너무 사실적 X · 너무 카툰 X**

### PBR 파라미터 가이드

| 재질 | Roughness | Metalness | Base Color 톤 |
|------|-----------|-----------|---------------|
| 밝은 원목 바닥 | 0.55~0.70 | 0 | `#E8C9A0` ~ `#D4A574` |
| 벽 (크림) | 0.75~0.90 | 0 | `#FAF6F0` ~ `#F0EBE3` |
| 패브릭 (소파·침구) | 0.85~0.95 | 0 | 채도 낮은 beige / sage / butter |
| 나무 가구 | 0.60~0.75 | 0 | `#C9956A` 계열 |
| 금속 (손잡이) | 0.25~0.40 | 0.6~0.9 | warm gold / brushed nickel |
| 유리 (창·샤워) | 0.05~0.15 | 0 | alpha 0.15~0.35 |
| 타일 (욕실) | 0.35~0.50 | 0 | `#EDF2F7` cool gray-blue |

### 텍스처

- Albedo: **저채도**, 노이즈 최소. 과한 wood grain / fabric weave 금지.
- Normal: subtle only (depth 0.3~0.8 scale)
- ORM 또는 separate AO/Roughness 권장
- **Flat shading / toon ramp 금지**
- **Photoreal 4K PBR scan 금지** (너무 사실적)

### 통일 규칙

- 모든 GLB는 **동일 roughness 범위** (0.55~0.95) 안에 있어야 함.
- 에셋 간 specular highlight 크기가 크게 다르면 **아트 리뷰 탈락**.

---

## ④ 카메라 (Camera)

**Orthographic Isometric** — perspective distortion 없음.

### 3단계 상태 (전부 **애니메이션** 전환)

```
Overview  ──(lerp 600~900ms ease-in-out)──►  Room Zoom  ──(lerp 400~600ms)──►  Furniture Edit
     ▲                                              │                              │
     └────────────── 저장/뒤로 (reverse) ────────────┴──────────────────────────────┘
```

| 상태 | 용도 | Zoom | Target | 비고 |
|------|------|------|--------|------|
| **Overview** | 집 전체, 방 탭 선택 | 58~72 | 아파트 plan center | 4방 cutaway 전체 노출 |
| **Room Zoom** | 방 꾸미기 진입 | 85~105 | 해당 room AABB center | 앞벽 open, 바닥 그리드 준비 |
| **Furniture Edit** | 가구 선택·배치 | 95~115 | 선택 가구 + floor cell | UI 그리드·회전 버튼과 동기 |

### 고정 각도

- Elevation: **~35°**
- Azimuth: **~45°** (기준 이미지와 동일 — 모든 상태에서 유지, **이동은 target/zoom만**)

### 전환 커브

- `easeInOutCubic` 또는 equivalent
- Overview↔Room: **카메라 + subtle DOF/fog shift** (optional)
- 편집 중 pinch zoom: ±15% within state, state boundary 넘지 않음

### 금지

- 상태 간 **cut / jump** (애니메이션 없음)
- Perspective camera
- Orbit 자유 회전 (모바일 게임 UX와 불일치)

---

## ⑤ 방 구조 (Architecture)

**얇은 판 X — 실제 건축처럼 두께·깊이·층위가 있어야 한다.**

### 벽 (Wall)

| 요소 | 스펙 |
|------|------|
| **두께** | 120~180mm (월드 0.12~0.18 unit) |
| **높이** | 2.4~2.6m |
| **Cutaway** | Dollhouse: **남쪽(카메라 쪽) 벽 제거**, 나머지 3면 + 천장 edge 유지 |
| **상단면** | 벽 top cap — **dark warm gray** `#4A4038` (기준 이미지 cutaway edge) |
| **몰딩** | Baseboard H=80~100mm, protrusion 10~15mm · Crown optional |

### 문 (Door)

| 요소 | 스펙 |
|------|------|
| **문틀** | Frame width 80~100mm, depth = wall thickness |
| **문짝** | Rounded edge, inset panel or flat |
| **손잡이** | 별도 mesh, metal material |

### 창 (Window)

| 요소 | 스펙 |
|------|------|
| **깊이** | Recess 150~250mm into wall |
| **프레임** | Inner sill + outer trim |
| **유리** | Thin glass plane, subtle reflection |
| **빛** | Window area = secondary warm light leak ( baked or area light ) |

### 바닥 (Floor)

| 요소 | 스펙 |
|------|------|
| **높이** | Slab thickness visible at cutaway edge (30~50mm) |
| **재질** | Living/bedroom: light oak plank · Kitchen: tile or wood transition · Bathroom: cool tile |
| **러그** | Separate mesh, 5~10mm elevation, soft edge |

### 방 구성 (기준 이미지 floor plan)

| 방 | 필수 가구 GLB (최소) |
|----|---------------------|
| 거실+주방 open | sofa, coffee_table, tv_stand, tv, dining_table, chair×2, kitchen_cabinet_run, fridge, rug, plant, floor_lamp |
| 침실 1 | bed, nightstand, lamp, wardrobe or bookshelf, rug |
| 침실 2 | bed, desk, chair, bookshelf, rug |
| 욕실 | toilet, sink_vanity, shower_glass, mirror, small_shelf |

---

## ⑥ 금지사항 (Absolute Prohibition)

**최종 게임 빌드에서 아래 사용 금지.**

| 금지 | 대체 |
|------|------|
| SVG 가구/방 | GLB |
| PNG / WebP 가구 스프라이트 | GLB |
| Procedural furniture mesh | GLB catalog |
| Placeholder / debug mesh | 없음 — 에셋 없으면 **해당 슬롯 비노출** |
| 2D % sticker placement | 3D grid (`gx`, `gz`, `rot`) |
| `APT HOME` / wireframe / dev text | 없음 |
| `living-preset.json` 65-item demo pack | curated default layout only |

**개발 중 temporary:** procedural은 `DEV_ONLY` flag + Art Bible §⑥ 위반 표시 watermark. **프로덕션 번들 포함 금지.**

---

## UI (기준 이미지 4-panel)

UI는 3D와 **톤 통일** — cream/beige/gold, rounded 16~24px radius.

| 영역 | 스펙 |
|------|------|
| HUD | Avatar + Lv pill + Gold/Gem pills with `+` |
| Mission banner | Single line + gold reward chip |
| Bottom nav | 5 tabs, active = dark brown pill |
| Edit drawer | Category tabs + horizontal GLB **thumbnail render** (not flat icon) |
| Placement UI | Green grid under item · X / rotate / check below selection |

UI mockup은 별도 Figma/component spec — **3D 썸네일은 동일 GLB의 offline render**.

---

## 에셋 제작 우선순위 (변경됨)

**Phase A 12 GLB 일괄 제작 X.** Corner Sample 먼저.

### Phase 0 — Corner Sample (Style 검증)

[`APT_STYLE_LOCK.md`](./APT_STYLE_LOCK.md) CS-01~06:

- Corner shell, sofa, rug, coffee table, plant, floor lamp
- **Asset Gate** + **Style Gate** + **90% Gate** 통과 후 확장

### Phase 1~3 — 확장

Style Gate 승인 후 [`APT_ASSET_STRATEGY.md`](./APT_ASSET_STRATEGY.md) Phase 1~4 inventory

---

## 수용 기준 (3 Gates)

| Gate | 문서 | 기준 |
|------|------|------|
| **Asset Gate** | [`APT_ASSET_GATE.md`](./APT_ASSET_GATE.md) | GLB·UV·PBR·LOD·그림자·스타일 검수 |
| **Style Gate** | [`APT_STYLE_LOCK.md`](./APT_STYLE_LOCK.md) | 오너: "이 스타일로 전체 확장 가능" |
| **90% Gate** | mockup 비교 | 육안 유사도 ≥ 90% |

**세 Gate 모두 통과 전:** 엔진 연결 · Phase 확장 금지

---

## 기술 연동 (3 Gates 통과 후만)

| 레이어 | 역할 |
|--------|------|
| `public/apt/glb/` | Asset Gate 통과 GLB만 |
| `useGLTF` | Loader |
| `IsoCanvas` | Scene root |
| Lighting rig | Art Bible §② |
| Camera rig | Art Bible §④ |

---

## 관련 문서

- `.cursor/rules/apt-diorama-quality.mdc` — Cursor 작업 규칙
- [`APT_STYLE_LOCK.md`](./APT_STYLE_LOCK.md) — **스타일 수치 (모델링 전 필수)**
- [`APT_ASSET_STRATEGY.md`](./APT_ASSET_STRATEGY.md) — Hybrid 확보 전략
- [`APT_ASSET_GATE.md`](./APT_ASSET_GATE.md) — 에셋 품질 검수

---

*Last updated: 2026-06-27 · Reference: apt-target-mockup (4-panel isometric mobile game mockup)*
