# APT Asset Gate

**목적:** GLB가 **엔진에 연결되기 전** 반드시 거치는 품질 검수.  
**Visual 90% Gate**와 별개 — **에셋 자체**가 Style Lock을 만족하는지 확인한다.

> Asset Gate **미통과** → `public/apt/glb/` 등록 금지 · 코드 연결 금지

**관련:** [`APT_STYLE_LOCK.md`](./APT_STYLE_LOCK.md) · [`APT_ART_BIBLE.md`](./APT_ART_BIBLE.md)

---

## Gate 관계

```
Style Lock 문서 승인
        ↓
Corner Sample GLB 제작
        ↓
┌─ Asset Gate (에셋 품질) ─┐
│  per-asset checklist      │
└───────────┬───────────────┘
            ↓
   Style Gate (오너: "이 스타일로 확장 가능")
            ↓
   90% Gate (mockup 나란히 비교)
            ↓
   엔진 연결 · Phase 확장
```

---

## Per-Asset 체크리스트 (복사해서 에셋마다 사용)

에셋 ID: `____________`  
파일: `public/apt/glb/____________.glb`  
검수일: ____________  
검수자: ____________

### A. 파일 · 구조

- [ ] **A1.** GLB 존재, glTF 2.0, Y-up, scale 1 unit = 1m
- [ ] **A2.** Tri count Style Lock 범위 내
- [ ] **A3.** Pivot: 바닥 접점 (가구) / room origin (shell)
- [ ] **A4.** Naming convention `apt/{category}/{id}.glb`

### B. UV · 텍스처

- [ ] **B1.** UV 0~1, no fatal overlap (의도적 mirror 제외)
- [ ] **B2.** AO map or 2nd UV for bake (shell·hero 가구)
- [ ] **B3.** Texture max 2048 (hero), 1024 (소품) — 4K 금지

### C. PBR · Style Lock

- [ ] **C1.** Roughness 0.62~0.92 (Art Bible §③)
- [ ] **C2.** Albedo 채도 S≤35%, 허용 팔레트 내
- [ ] **C3.** Bevel R Style Lock 범위 (가구 8~25mm)
- [ ] **C4.** Metalness: 가구 body ≤0.15, metal parts only
- [ ] **C5.** **Procedural / flat color only mesh 없음**

### D. LOD · 성능 (모바일)

- [ ] **D1.** Single LOD acceptable for v1; tris within budget
- [ ] **D2.** Draco optional; uncompressed ≤ 2MB (가구), ≤ 5MB (shell)

### E. 그림자 · 씬

- [ ] **E1.** Cast shadow ON
- [ ] **E2.** Receive shadow ON (바닥 접촉 mesh)
- [ ] **E3.** Corner Sample lighting rig에서 contact shadow 정상
- [ ] **E4.** AO: 벽-바닥·가구 아래 darkening 가시

### F. 스타일 검수

- [ ] **F1.** 동일 Corner Sample 내 다른 에셋과 **톤 일치**
- [ ] **F2.** mockup 해당 오브젝트와 실루엣·비율 유사
- [ ] **F3.** §⑥ 금지: SVG/PNG/WebP/Placeholder/Procedural **없음**
- [ ] **F4.** Art director / owner **육안 OK**

---

## Corner Sample Gate (CS-01 ~ CS-06)

**전체 통과 전 Phase 1 착수 금지.**

| ID | 에셋 | A | B | C | D | E | F | 통과 |
|----|------|---|---|---|---|---|---|------|
| CS-01 | Corner shell | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| CS-02 | Sofa | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| CS-03 | Rug | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| CS-04 | Coffee table | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| CS-05 | Plant | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| CS-06 | Floor lamp | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

**Corner Sample Asset Gate:** ☐ 통과 · Date: _______

---

## Phase Gate (확장 시)

### Phase 1 — Living + Kitchen visible

| 에셋 | Asset Gate | 엔진 연결 |
|------|------------|-----------|
| tv_stand | ☐ | ☐ |
| tv | ☐ | ☐ |
| dining_table | ☐ | ☐ |
| chair | ☐ | ☐ |
| kitchen_run | ☐ | ☐ |
| fridge | ☐ | ☐ |

*(Phase 1表은 Style Gate 통과 후 채움)*

---

## 실패 시

| 결과 | 조치 |
|------|------|
| C 항목 fail | Material pass 재작업 |
| F 항목 fail | Style Lock 재확인, form 수정 |
| E 항목 fail | mesh pivot / shadow flag |
| **Gate fail** | 엔진 PR merge 금지 |

---

## Cursor 규칙

- Asset Gate 통과 목록: `docs/asset-gate-registry.json` (추후 — Gate 통과 에셋 ID만 기록)
- 코드에서 `useGLTF` 로드 전 registry 확인 (추후 구현 — **에셋 있기 전 코드 작성 안 함**)

---

*Asset Gate는 "90% Gate"를 대체하지 않는다. **둘 다** 통과해야 한다.*
