import type { ActivityDefinition } from "./types";
import { getMinigameById } from "@/lib/minigames/registry";
import { getMinigameRoute } from "@/lib/minigames/game-meta";

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
    href: getMinigameRoute("alkkagi"),
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
    href: getMinigameRoute("chess"),
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
    href: getMinigameRoute("janggi"),
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
    href: getMinigameRoute("omok"),
  },
  {
    id: "baduk",
    title: "바둑",
    titleEn: "Baduk",
    description: getMinigameById("baduk")?.description ?? "19×19 · 따내기 · 패 · 집 계산",
    descriptionEn: "19×19 Go · capture · ko · scoring",
    icon: "◯",
    category: "game",
    minPlayers: 2,
    maxPlayers: 2,
    playable: true,
    minigameId: "baduk",
    href: getMinigameRoute("baduk"),
  },
  {
    id: "sketch-quiz",
    title: "스케치 퀴즈",
    titleEn: "Sketch Quiz",
    description: getMinigameById("sketch-quiz")?.description ?? "그림으로 맞히는 캐치마인드 · 친구 방 / 랜덤 매칭",
    descriptionEn: "Draw & guess · friend rooms / random match",
    icon: "✏️",
    category: "game",
    minPlayers: 2,
    maxPlayers: 5,
    playable: true,
    href: getMinigameRoute("sketch-quiz"),
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
    href: getMinigameRoute("reversi"),
  },
  {
    id: "liar-game",
    title: "라이어 게임",
    titleEn: "Liar Game",
    description: "제시어를 아는 시민 vs 모르는 라이어 · 3인 이상 · 토론 후 투표",
    descriptionEn: "Civilians vs liar · 3+ players · discuss & vote",
    icon: "🎭",
    category: "game",
    minPlayers: 3,
    maxPlayers: 8,
    playable: true,
    href: "/liar-game",
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
