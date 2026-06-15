/** 솔로 vs CPU 공통 상수·타입 */

export type MinigameAiDifficulty = "easy" | "normal" | "hard";

export const MINIGAME_CPU_USER_ID = "__minigame_cpu__";
export const MINIGAME_CPU_USERNAME = "CPU";

/** @deprecated use MINIGAME_CPU_USER_ID */
export const OMOK_CPU_USER_ID = MINIGAME_CPU_USER_ID;
/** @deprecated use MINIGAME_CPU_USERNAME */
export const OMOK_CPU_USERNAME = MINIGAME_CPU_USERNAME;

export const CPU_BOARD_GAME_IDS = ["omok", "reversi", "chess", "janggi", "baduk"] as const;
export type CpuBoardGameId = (typeof CPU_BOARD_GAME_IDS)[number];

export function isCpuBoardGame(gameId: string): gameId is CpuBoardGameId {
  return (CPU_BOARD_GAME_IDS as readonly string[]).includes(gameId);
}

export function isMinigameCpuUserId(userId: string): boolean {
  return userId === MINIGAME_CPU_USER_ID;
}

export const AI_DIFFICULTY_OPTIONS: {
  id: MinigameAiDifficulty;
  label: string;
  hint: string;
}[] = [
  { id: "easy", label: "EASY", hint: "가끔 실수 · 초보에게 적합" },
  { id: "normal", label: "NORMAL", hint: "균형 잡힌 휴리스틱 AI" },
  { id: "hard", label: "HARD", hint: "깊은 탐색 · 강함" },
];

export function cpuRoleForGame(gameId: string): string {
  switch (gameId) {
    case "chess":
      return "black";
    case "janggi":
      return "blue";
    default:
      return "white";
  }
}
