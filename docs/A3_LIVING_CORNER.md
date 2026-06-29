# A-3 Living Corner Style Lock

**목표:** 거실 **6개 코너**를 완성해 앱 대표 스크린샷 품질을 고정한다.  
집 전체가 아니라 **한 방의 한 코너 세트**가 Style Lock이다.

**코드:** `src/lib/diorama/living-corner-preset.ts`  
**프리뷰:** `public/diorama/living-preset.json` (`npm run diorama:export-living`)

---

## 6 Corners

| # | 코너 | 스티커 ID | 역할 |
|---|------|-----------|------|
| ① | Sofa | `corner-sofa`, `corner-cushion`, `corner-frame` | 히어로 · 대표 스크린샷 |
| ② | TV | `corner-tv`, `corner-tv-console`, `corner-gamepad` | 여백 + 라이브 TV |
| ③ | Coffee | `corner-coffee`, `corner-mug`, `corner-remote` | 생활감 앵커 |
| ④ | Plant | `corner-plant`, `corner-vase` | 큰 1 + 작은 1 |
| ⑤ | Lamp | `corner-lamp` | 간접조명 · 높이 리듬 |
| ⑥ | Rug | `corner-rug` | 공간 묶기 |

벽: `corner-window` 1개만 (과밀 방지)

**총 14 items** · 목표 가구 면적 ~38% · 빈 공간 ~62%

---

## Style Lock 규칙

| 규칙 | 기준 |
|------|------|
| Negative space | 가구 35~45% · 빈 공간 55~65% |
| 둥글게 | 스티커 에셋 WebP — 직각 박스 금지 |
| 높이 리듬 | rug(낮) → table → sofa → plant → lamp → tv(벽) |
| 색상 | `bondee-color-bible.ts` 팔레트만 |
| 생활감 | mug · remote · cushion (2~4) — A-4에서 담요·슬리퍼 확장 |
| Material | A-2 Bible 100% |

---

## 높이 리듬 (Y%)

```
frame/window  ~25  ▲
tv            ~38  │
lamp          ~44  │ 3단+
plant         ~49  │
sofa          ~56  │
coffee        ~61  │
rug           ~67  ▼
```

---

## DoD 체크리스트

- [x] 6코너 프리셋 코드화 (`living-corner-preset.ts`)
- [x] 신규 유저 기본 레이아웃 적용
- [x] 레거시 65개·`lr-*`·`sofa-main` 자동 리셋
- [ ] WebP 에셋 Art Pass (둥근 실루엣 · 저채도) — 아트 작업
- [ ] Blind test 스크린샷 3/5 "Bondee 같다"
- [ ] Corner Sample GLB (향후 CS-01~06)

---

## A-4 Story Layer (다음)

코너 위에 **상태**만 추가:

- 소파 담요
- 테이블 머그(이미 있음) + 책
- TV 리모컨(이미 있음)
- 슬리퍼 (러그 옆)

새 가구 추가 X · `corner-*` id 유지

---

## QA

1. `?replayIntro=1` → 거실 진입
2. 14개 스티커 · 과밀 없음 확인
3. `public/diorama/preview.html` — export JSON 미리보기
4. Release QA Persona 1.5
