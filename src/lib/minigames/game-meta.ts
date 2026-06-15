import { getMinigameById } from "./registry";

export function getMinigameRoute(gameId: string): string {
  if (gameId === "sketch-quiz") return "/sketch-quiz";
  return `/play/${gameId}`;
}

export function isPlatformGameId(gameId: string): boolean {
  return !!getMinigameById(gameId) && gameId !== "sketch-quiz";
}

export const PLATFORM_GAME_IDS = [
  "omok",
  "rps",
  "word-chain",
  "reversi",
  "chess",
  "janggi",
  "baduk",
  "alkkagi",
  "chosung-quiz",
  "word-guess",
  "number-guess",
  "memory-cards",
  "picture-match",
  "slide-puzzle",
  "spot-diff",
  "piano-rush",
  "parking-rush",
  "jigsaw",
] as const;
