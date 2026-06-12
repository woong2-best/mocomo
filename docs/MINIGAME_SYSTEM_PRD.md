# MoCoMo 미니게임 플랫폼 PRD

> 목표: Steam/Discord Games/BGA/Chess.com/Lichess 수준의 확장 가능한 실시간 미니게임 플랫폼  
> 원칙: **모듈형 아키텍처** — 새 게임 추가 시 기존 매칭·관전·랭킹·리플레이 코어 수정 최소화

## 현재 구현 상태 (2026-05)

| 영역 | 상태 |
|------|------|
| GAME 허브 `/games` | ✅ 카테고리·레지스트리 |
| 스케치퀴즈 | ✅ 친구 방·랜덤 매칭(2~5명) |
| 오목 | ✅ 15×15 · 매칭 · 관전 |
| 가위바위보 | ✅ 3판 2선승 |
| 끝말잇기 | ✅ 사전 검증 · 2~6인 |
| 공통 소켓 (Render) | ✅ `minigame_*` 이벤트 |
| 게임 레지스트리 | ✅ `src/lib/minigames/registry.ts` |
| 관전·리플레이·MMR·시즌 | ⏳ Phase 4 |

---

## 지원 게임 (로드맵)

### 보드
오목, 체스, 장기, 알까기, 바둑, 리버시

### 단어
끝말잇기, 초성퀴즈, 단어 맞추기, **스케치퀴즈 (live)**

### 퍼즐
직소, 슬라이드, 그림 맞추기, 틀린 그림 찾기

### 캐주얼
가위바위보, 숫자 맞추기, 카드 뒤집기

---

## 공통 기능 (전 게임)

### 매칭
- 랜덤 / 친구 초대 / 코드 / 공개·비공개 방

### 관전
- 관전자 수, 관전 채팅 on/off, 게임 영향 불가

### 채팅
- 방 채팅, 이모티콘, 신고·차단, 욕설 필터 (기존 live-chat-filter 재사용)

### 기록
- 승/패/무, 시간, 최근 대국

### 리플레이
- 수순 저장, 다시보기, 일시정지, 배속

### 랭킹
- 전체/주간/월간/친구, MMR, 티어(브론즈~챌린저)

### 시즌·업적·알림·부정행위 방지·수익화
- Phase 4+ (별도 스펙)

### 시간제
- 무제한, 30s~10m, 체스식 increment, 시간 초과 패배

---

## 기술 아키텍처 (목표)

```
src/lib/minigames/          # 타입·레지스트리·MMR·시간제
src/components/minigames/   # 공통 로비·대기방·관전 UI
server/minigames/           # RoomManager, MatchQueue, GamePlugin interface
server/minigames/plugins/   # omok.ts, chess.ts, sketch-quiz.ts …
prisma                      # GameRoom, GameMatch, GameMove, GameRating
```

### GamePlugin 인터페이스 (서버)

```typescript
interface MinigamePlugin {
  id: string;
  validateMove(state, move, userId): boolean;
  applyMove(state, move): GameState;
  checkWin(state): WinResult | null;
  serialize / deserialize for replay
}
```

### RoomManager (서버 권한)

- 턴 검증, 재접속 복구, 클라이언트 조작 방지
- WebSocket 이벤트: `minigame_match`, `minigame_join`, `minigame_move`, `minigame_spectate`

---

## 구현 단계

### Phase 1 — 플랫폼 기반 (진행 중)
- [x] 게임 레지스트리 + 허브 UI
- [x] 스케치퀴즈 실시간 매칭
- [ ] `MinigameRoomManager` 추상화 (sketch-quiz 마이그레이션)
- [ ] Prisma `MinigameMatch` / `MinigameMove` 스키마

### Phase 2 — 보드 1종 + 공통 대기방
- [ ] 오목 (15×15, 렌주, server authoritative)
- [ ] 공통 대기방 UI (준비, 핑, 티어 표시)
- [ ] 관전 MVP

### Phase 3 — 단어·캐주얼
- [ ] 끝말잇기 (사전 API)
- [ ] 가위바위보

### Phase 4 — 랭킹·리플레이·시즌
- [ ] MMR, 티어, 리플레이 플레이어
- [ ] 주간/월간 리더보드

### Phase 5 — 고난이도
- [ ] 체스/장기/바둑 엔진 연동
- [ ] 알까기 물리 (matter.js / 서버 시뮬)
- [ ] 퍼즐 협동

---

## 참고

- 기존 라이브 오버레이 게임(초성퀴즈, 돌림판 등)은 **방송용** — 본 플랫폼과 별도
- 소켓: `NEXT_PUBLIC_SOCKET_URL` + Render `mocomo-socket` 필수
