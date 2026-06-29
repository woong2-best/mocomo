# RC Sprint 1 — QA Checklist

**Sprint:** Living Room Style Lock Complete  
**Version:** `rc1-living-style-lock-v1`

---

## Pre-flight

- [ ] `npm run diorama:export-living` — 20 stickers exported
- [ ] `npx tsc --noEmit` — no errors
- [ ] `public/diorama/living-preset.json` version matches style lock

---

## Visual — Living Room

- [ ] 소파가 히어로로 보이고 negative space ~60% 유지
- [ ] 러그가 소파·테이블을 묶음
- [ ] TV 벽 여백 충분 (답답하지 않음)
- [ ] Story props 보임: 슬리퍼, 책, 잡지, 촛불, 충전기
- [ ] Material 톤 통일 (warm, low saturation)
- [ ] 창 햇빛 오버레이 자연스러움
- [ ] Plant / Lamp / TV ambient 애니메이션 동작

---

## Camera

- [ ] 첫 진입 시 미세 줌인 (0.98 → 1.0, ~900ms)
- [ ] focusX 46% — 소파 중심 시선
- [ ] scale 1.06 — 적당한 클로즈업

---

## Device Matrix

| Device | Viewport | Screenshot |
|--------|----------|------------|
| Galaxy S24 | 360×780 @3x | `rc1-living-galaxy-s24.png` |
| iPhone 15 | 390×844 @3x | `rc1-living-iphone-15.png` |
| Galaxy Fold | 673×841 | `rc1-living-galaxy-fold.png` |
| iPad | 820×1180 @2x | `rc1-living-ipad.png` |
| Web Desktop | 1280×800 | `rc1-living-web-desktop.png` |

```bash
npm run diorama:capture-rc1 http://127.0.0.1:3456
```

- [ ] 모든 기기에서 스티커 클리핑 없음
- [ ] safe area 침범 없음 (game mode)
- [ ] backdrop 비율 유지

---

## Edit Mode Regression

- [ ] 편집 모드 진입/퇴장 정상
- [ ] 드래그·회전·삭제 동작
- [ ] 저장 후 새로고침 유지
- [ ] RC-1 레이아웃은 `shouldResetGameLayout` 스킵 (20 items OK)

---

## First Entry (RC-A A-1)

- [ ] 첫 방문 intro 재생
- [ ] `localStorage apt-first-impression-v1` 스킵
- [ ] `?replayIntro=1` 재생
- [ ] intro 후 living room 자동 진입

---

## Art Pass

- [ ] `npm run diorama:art-pass` 실행 완료
- [ ] WebP 백업 존재 (`_rc1-backup/`)
- [ ] 투명도 손상 없음
- [ ] 과포화/과노출 없음

---

## Sign-off

| Role | Name | Date | Pass |
|------|------|------|------|
| Dev | | | |
| Design | | | |
| QA | | | |

**DoD:** 위 체크리스트 90%+ 통과 + 대표 스크린샷 5장 승인
