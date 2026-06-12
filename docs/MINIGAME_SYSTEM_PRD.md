# MoCoMo 미니게임 플랫폼 PRD

> 목표: 확장 가능한 실시간 미니게임 플랫폼 (모듈형 플러그인)

## 현재 구현 상태

| 영역 | 상태 |
|------|------|
| GAME 허브 `/games` | ✅ 17종 카탈로그 |
| 통합 플레이 `/play/[gameId]` | ✅ |
| 스케치퀴즈 | ✅ `/sketch-quiz` (별도) |
| **플랫폼 게임 16종** | ✅ 전부 live |
| 소켓 `minigame_*` | ✅ Render 배포 필요 |
| MMR·전적 DB | ✅ 스키마 + 종료 시 저장 (Z4 SQL) |
| 관전 | ✅ 전 게임 |
| 리플레이 UI | ⏳ moves 저장만 |
| 시즌·업적·수익화 | ⏳ Phase 5 |

### Live 게임

**보드:** 오목, 체스, 장기, 알까기, 바둑, 리버시  
**단어:** 끝말잇기, 초성퀴즈, 단어 맞추기 (+ 스케치퀴즈)  
**퍼즐:** 직소, 슬라이드, 그림 맞추기, 틀린 그림 찾기  
**캐주얼:** 가위바위보, 숫자 맞추기, 카드 뒤집기  

---

## 아키텍처

```
server/minigames/store.ts       — RoomManager
server/minigames/plugins/       — 게임별 플러그인
src/app/play/[gameId]/          — 통합 허브·방
src/lib/minigames/registry.ts   — 카탈로그
prisma MinigameMatch/Rating     — 전적·MMR
```

새 게임 추가: `plugins/new-game.ts` + `plugins/index.ts` + registry 항목

---

## 배포

- Vercel: 프론트 자동 배포
- Render `mocomo-socket`: **필수** 재배포
- Supabase: `scripts/supabase-fix-all.sql` **Z4** 실행 (MMR/전적)
