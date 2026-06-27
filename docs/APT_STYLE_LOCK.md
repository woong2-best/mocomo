# APT Style Lock

**목적:** Blender·구매·AI·외주 **어떤 경로든** 동일한 결과가 나오도록, 모델링 전에 숫자와 기준을 고정한다.  
**상태:** Style Lock 초안 · **Corner Sample 미제작** · Style Lock 승인 전 모델링/코드 연결 금지

> GLB를 만드는 것보다 **먼저** 이 문서를 확정한다.  
> Style Lock 미승인 상태에서 Shell·Placeholder·Blender 템플릿 작업 **하지 않는다**.

**상위 문서:** [`APT_ART_BIBLE.md`](./APT_ART_BIBLE.md)  
**기준 이미지:** `public/apt/reference/apt-target-mockup.png`

---

## Style Lock이란

같은 게임 안에서 소파·침대·식탁이 **한 팀이 만든 것처럼** 보이게 하는 **측정 가능한 규칙**.

Style Lock 없이 에셋을 만들면 방마다 팔걸이 두께, 채도, roughness가 달라진다.

---

## 전역 상수 (모든 GLB 공통)

| 항목 | 값 | 비고 |
|------|-----|------|
| 단위 | 1 unit = 1 meter | Three.js Y-up |
| 가구 스케일 | 실제 치수 × **0.88** | 미니어처感 |
| Bevel (가구 외곽) | **R = 8~25mm** | 팔걸이·테이블·선반 상단 |
| Bevel (벽·문) | **R = 3~8mm** | architecture는 가구보다 작게 |
| Albedo 채도 | **S ≤ 35%** (HSV) | Bondee 크림/베이지 톤 |
| Albedo 명도 | **L = 55~85%** | 너무 어둡거나 형광 X |
| Roughness | **0.62 ~ 0.92** | §③ Art Bible |
| Metalness | **0 ~ 0.15** (가구) · **0.5~0.9** (손잡이만) | |
| Normal strength | **0.3 ~ 0.8** | 과한 디테일 X |
| 폴리 (가구) | 3,000 ~ 8,000 tris | |
| 폴리 (소품) | 200 ~ 1,500 tris | |
| 그림자 | Cast + Receive ON | 바닥 contact 필수 |

### 팔레트 (허용 Base Color)

```
Cream wall:     #FAF6F0
Warm wood:      #C9956A  (primary furniture)
Light oak floor:#E8C9A0
Sage accent:    #9BB89A  (plant, cushion accent)
Beige fabric:   #D4C4B0  (sofa, bedding)
Charcoal edge:  #4A4038  (wall cutaway cap only)
```

**금지:** 순수 #FFFFFF, #000000 albedo · 네온 · 고채도 primary

---

## Corner Sample — Style Lock 검증 세트

**전체 방·수십 개 가구 X.**  
거실 **한 코너**만 Art Bible 목표 품질으로 만든 뒤, Style Lock 승인 → 확장.

### 포함 오브젝트 (5+1)

| ID | 에셋 | Style Lock 핵심 |
|----|------|-----------------|
| CS-01 | **Corner shell** | 바닥 plank + 2면 벽 + cutaway + baseboard + 창 1개 recess |
| CS-02 | **Sofa** | 아래 § 소파 스펙 |
| CS-03 | **Rug** | 아래 § 러그 스펙 |
| CS-04 | **Coffee table** | 아래 § 테이블 스펙 |
| CS-05 | **Floor plant** | 아래 § 화분 스펙 |
| CS-06 | **Floor lamp** | 아래 § 스탠드 스펙 |

### CS-02 Sofa — 수치 Lock

| 속성 | 값 |
|------|-----|
| 전체 W×D×H | 2100 × 900 × 820 mm (×0.88 적용) |
| 팔걸이 두께 | **140mm** (±10) |
| 등받이 두께 | **180mm** (±15) |
| 좌방석 쿠션 | **2개** (분리 mesh, gap 20mm) |
| 등받이 쿠션 | **2개** |
| 팔걸이 bevel R | **22mm** |
| 다리 | 원목 4개, **H=120mm**, **Ø=60mm**, bevel R=8mm |
| Fabric base | `#D4C4B0`, roughness **0.88** |
| Wood leg | `#C9956A`, roughness **0.68** |
| 스티치 | inset line, normal only, **없어도 됨** (1개만) |

### CS-03 Rug

| 속성 | 값 |
|------|-----|
| 형태 | 원형 또는 둥근 rect |
| 직경 / 크기 | **1800mm** |
| 두께 | **12mm** (바닥 위 elevation) |
| Edge | **bevel R=6mm**, no hard fringe |
| Base | `#E8DDD0`, roughness **0.92** |
| Pattern | **없음** 또는 아주 약한 weave normal |

### CS-04 Coffee Table

| 속성 | 값 |
|------|-----|
| Top W×D | **900 × 500 mm** |
| Top 두께 | **35mm**, top bevel **R=12mm** |
| 다리 | 4개, **H=380mm**, **40×40mm** rounded |
| Wood | `#C9956A`, roughness **0.70** |
| Top 위 소품 | **없음** (Corner Sample 단계) |

### CS-05 Floor Plant

| 속성 | 값 |
|------|-----|
| 화분 H | **320mm** |
| 화분 | terracotta `#B8846A`, roughness **0.75** |
| 잎 | **5~9 leaf** mesh, `#6B9B6E` ~ `#9BB89A`, roughness **0.85** |
| 과장 | 실물보다 **15% 큰 잎** (귀여운 비율) |

### CS-06 Floor Lamp

| 속성 | 값 |
|------|-----|
| 전체 H | **1550mm** |
| Base | disk **Ø=280mm**, H=25mm |
| Pole | **Ø=18mm** cylinder |
| Shade | cone/truncated, fabric `#FAF0E0`, roughness **0.90** |
| Metal | base ring only, metalness **0.7**, roughness **0.35** |

### CS-01 Corner Shell

| 속성 | 값 |
|------|-----|
| Floor | 3200 × 2800 mm oak plank |
| Walls | 2면 L-corner, thickness **150mm** |
| Wall height | **2500mm** |
| Baseboard | H=90mm, projection 12mm |
| Window | 1 recess **200mm**, 좌측 벽 |
| Cutaway | 카메라-facing edge open, top cap `#4A4038` |

---

## Corner Sample 조명 Lock (검증 씬)

Art Bible §②와 동일. Corner Sample 렌더 시 **변경 금지**.

| Light | Setting |
|-------|---------|
| Key | Directional, intensity 1.15, color `#FFF4E6`, position (6, 10, 4) |
| Fill | intensity 0.28, color `#E8F0FF` |
| Hemisphere | sky `#FFF4E6` / ground `#E8C9A0`, intensity 0.45 |
| Shadow | PCF soft, map 2048 |
| AO | SSAO **or** baked AO on shell |

---

## Corner Sample 카메라 Lock

| | Value |
|--|-------|
| Type | Orthographic |
| Elevation | 35° |
| Azimuth | 45° |
| Zoom | 95 (corner fills ~70% frame) |
| Target | sofa front edge center |

---

## Style Lock 승인 기준

Corner Sample GLB + 동일 조명 rig로 렌더한 **정지 이미지 1장**을 mockup 거실 코너와 나란히 비교.

| Gate | 기준 |
|------|------|
| **Style Gate** | "이 스타일로 전체 게임을 만들 수 있겠다" — **제품 오너 육안 승인** |
| **90% Gate** | mockup 대비 육안 유사도 ≥ 90% |
| **Asset Gate** | [`APT_ASSET_GATE.md`](./APT_ASSET_GATE.md) CS-01~06 전 항목 통과 |

**세 Gate 모두 통과 전:** 다른 방·다른 가구 확장 · 엔진 코드 연결 **금지**.

---

## Style Lock 승인 후 확장 순서

1. Corner Sample 승인
2. 거실 나머지 (TV, kitchen visible edge) — **동일 § 전역 상수**
3. 침실 · 욕실 · 주방 shell
4. Shop catalog variants (색상만 변경, form language 유지)

---

## 금지 (Style Lock 단계)

- Style Lock 없이 Blender scene template 제작
- "Shell placeholder" GLB
- Procedural mesh를 Style Sample로 제출
- Corner Sample 없이 Phase B/C 가구量산

---

*Owner sign-off: _______________  Date: _______________*
