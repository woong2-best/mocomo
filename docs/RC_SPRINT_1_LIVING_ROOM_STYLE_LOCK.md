# RC Sprint 1 — Living Room Style Lock

**Version:** `rc1-living-style-lock-v1`  
**목표:** 거실 하나만 봐도 서비스 전체 퀄리티를 대표할 수 있는 수준

---

## Layout Lock

캔버스 기준: aspect 4/3, ref width **390px** (@3x mobile)

| 항목 | 값 | 비고 |
|------|-----|------|
| 소파 ↔ 러그 Y 간격 | **~38px** (11% canvas) | `sofa y=57` · `rug y=68` |
| TV 벽 우측 여백 | **12%+** | TV center x=64% |
| Plant 정규화 높이 | **0.9m** | scale 0.74 @ y=48 |
| Lamp 정규화 높이 | **1.3m** | scale 0.58 @ y=43 |
| Negative space | **62%** | 가구 fill ~38% |
| 스티커 수 | **20** | 6코너 + Story Layer |

### 6 Corners

| Corner | Anchor (x,y) | Items |
|--------|--------------|-------|
| Sofa | 34, 57 | sofa, cushion×2, magazine, frame |
| TV | 64, 37 | tv, shelf, gamepad |
| Coffee | 47, 62 | coffee-table, mug, books, remote, charger |
| Plant | 26, 48 | plant, vase |
| Lamp | 68, 43 | lamp, candle |
| Rug | 50, 68 | rug, slippers |

### Story Layer

- 접힌 담요 (`corner-cushion-blanket`)
- 눌린 쿠션 (`corner-cushion-pressed`)
- 반쯤 읽은 책 (`corner-books`)
- 컵 (`corner-mug`)
- 슬리퍼 (`corner-slippers`)
- 충전기 (`corner-charger` → telephone asset)
- 잡지 (`corner-magazine`)
- 촛불 (`corner-candle`)

---

## Camera Lock

| Param | Value |
|-------|-------|
| scale | 1.06 |
| translateY | -2.5% |
| focusX | 46% |
| enterScale | 0.98 → 1.0 (900ms ease-out) |

소스: `src/lib/diorama/living-room-style-lock.ts` · `room-camera.ts`

---

## Lighting (Hero)

단일 대표 조명: **Afternoon Golden**

- Key warm: `#FFF4E6`
- Ambient cream: `#FFF4E7`
- Window azimuth: 225°

오버레이: `DioramaLivingAmbient` (창 햇빛 + 바닥 반사)

---

## Material Bible (2D)

타입별 CSS LUT — `src/lib/diorama/sticker-material-css.ts`

| Kind | Types |
|------|-------|
| fabric | sofa, cushion, rug, slippers, magazine, books |
| wood | coffee-table, shelf, frame-small |
| plastic | tv, remote, mug, plant, lamp, candle, vase, gamepad, telephone |
| glass | window |

공통 shadow: `BONDEE_STICKER_SHADOW` (`bondee-color-bible.ts`)

---

## Ambient Animation

| Sticker | Class | Effect |
|---------|-------|--------|
| plant | `apt-living-plant-sway` | 4.5s 좌우 흔들림 |
| lamp, candle | `apt-living-lamp-glow` | 3.2s glow pulse |
| tv | `apt-living-tv-glow` | 2.8s screen glow |
| window | `apt-living-window-shimmer` | 6s shimmer |
| room | `apt-living-window-sun` | 창 햇빛 drift |
| room | `apt-living-floor-bounce` | 바닥 반사 pulse |

---

## Art Pass

```bash
npm run diorama:art-pass              # → _rc1-out/ (safe preview)
node scripts/living-room-art-pass.mjs --apply  # 원본 덮어쓰기
npm run diorama:art-pass -- --restore # 백업 복원
```

백업: `public/diorama/stickers/living/_rc1-backup/`  
출력: `public/diorama/stickers/living/_rc1-out/`

---

## Export & Preview

```bash
npm run diorama:export-living
# → public/diorama/living-preset.json

# Preview: /diorama/mobile-preview.html
```

---

## Screenshot Pass

```bash
# dev server on :3456 first
npm run diorama:capture-rc1
# → public/diorama/rc1-screenshots/
```

Devices: Galaxy S24, iPhone 15, Galaxy Fold, iPad, Web Desktop

---

## Source of Truth

```
src/lib/diorama/living-room-style-lock.ts   # layout + camera + version
src/lib/diorama/living-corner-preset.ts     # re-export (compat)
src/lib/apt/game/room-presets.ts            # LIVING_ROOM_PRESET
```

레거시 레이아웃 (30+ items, `sofa-main`, `lr-*`) → RC-1로 자동 리셋  
`isLivingRoomStyleLockLayout()` · `shouldResetGameLayout()`
