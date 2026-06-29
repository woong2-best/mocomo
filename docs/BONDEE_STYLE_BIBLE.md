# Bondee Style Bible — RC-A A-2

단일 Source of Truth: `src/lib/apt/style/`

| 모듈 | 내용 |
|------|------|
| `bondee-color-bible.ts` | 6~8색 팔레트 · CSS LUT · 금지색 |
| `bondee-lighting-bible.ts` | Sun · Ambient · Bounce · Rim · Fog · Bloom · SSAO |
| `bondee-material-bible.ts` | fabric · wood · plastic · metal · wall · floor |
| `bondee-renderer-config.ts` | WebGL tone mapping · fog |

## 적용 위치

- **3D:** `BondeeSceneLighting` → Dollhouse · Iso
- **2D 다이오라마:** `apt-bondee-world` CSS · `room-themes.ts`
- **재질:** `bondeeMat()` → `bondee-material-bible` 기본값

## Post FX (선택)

`?bondeeFx=1` — SSAO + Bloom (`BondeePostFx`, 기본 OFF)

## A-2 DoD 체크

- [x] Lighting Bible 모든 3D 방 공용
- [x] Material Bible `bondeeMat` 기본값
- [x] Color Bible `room-themes` 통일
- [x] Fog + Exposure + CSS LUT
- [x] Corner 6종 레이아웃 Lock (`living-corner-preset.ts`)
- [ ] WebP/GLB Art Pass (둥근 실루엣 · 저채도)
- [ ] Blind test 3/5 "Bondee 같다"
