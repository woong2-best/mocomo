import type { ActivityDefinition } from "./types";
import { getMinigameById } from "@/lib/minigames/registry";

/**
 * DM Play Together — /games 보드게임 로직을 그대로 씁니다.
 * minigameId가 있으면 기존 미니게임 엔진을 임베드합니다.
 */
const REGISTRY: ActivityDefinition[] = [
  {
    id: "alkkagi",
    title: "알까기",
    titleEn: "Alkkagi",
    description: getMinigameById("alkkagi")?.description ?? "물리 시뮬 · 드래그 발사",
    descriptionEn: "Physics · drag to shoot",
    icon: "⚪",
    category: "game",
    minPlayers: 2,
    maxPlayers: 2,
    playable: true,
    minigameId: "alkkagi",
  },
  {
    id: "chess",
    title: "체스",
    titleEn: "Chess",
    description: getMinigameById("chess")?.description ?? "FIDE 규칙",
    descriptionEn: "FIDE rules",
    icon: "♟",
    category: "game",
    minPlayers: 2,
    maxPlayers: 2,
    playable: true,
    minigameId: "chess",
  },
  {
    id: "janggi",
    title: "장기",
    titleEn: "Janggi",
    description: getMinigameById("janggi")?.description ?? "한국 장기 · 9×10",
    descriptionEn: "Korean chess · 9×10",
    icon: "🀄️",
    category: "game",
    minPlayers: 2,
    maxPlayers: 2,
    playable: true,
    minigameId: "janggi",
  },
  {
    id: "omok",
    title: "오목",
    titleEn: "Omok",
    description: getMinigameById("omok")?.description ?? "15×15 · 5목",
    descriptionEn: "15×15 five-in-a-row",
    icon: "⚫",
    category: "game",
    minPlayers: 2,
    maxPlayers: 2,
    playable: true,
    minigameId: "omok",
  },
  {
    id: "reversi",
    title: "리버시",
    titleEn: "Reversi",
    description: getMinigameById("reversi")?.description ?? "8×8 오셀로",
    descriptionEn: "8×8 Othello",
    icon: "🟤",
    category: "game",
    minPlayers: 2,
    maxPlayers: 2,
    playable: true,
    minigameId: "reversi",
  },
  {
    id: "tic-tac-toe",
    title: "틱택토",
    titleEn: "Tic Tac Toe",
    description: "3×3 클래식 · 턴제",
    descriptionEn: "Classic 3×3 turn-based",
    icon: "⭕",
    category: "game",
    minPlayers: 2,
    maxPlayers: 2,
    playable: true,
  },
];

export function listActivities(): ActivityDefinition[] {
  return [...REGISTRY];
}

export function listPlayableActivities(): ActivityDefinition[] {
  return REGISTRY.filter((a) => a.playable);
}

export function getActivityById(id: string): ActivityDefinition | undefined {
  return REGISTRY.find((a) => a.id === id);
}

export function registerActivity(def: ActivityDefinition) {
  const idx = REGISTRY.findIndex((a) => a.id === def.id);
  if (idx >= 0) REGISTRY[idx] = def;
  else REGISTRY.push(def);
}
