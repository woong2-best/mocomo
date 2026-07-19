import type { ActivityDefinition } from "./types";

/**
 * ActivityRegistry — 새 Activity는 여기 등록만 하면 DM/Community에 노출됩니다.
 * playable: true 인 항목만 인채팅 플레이가 연결됩니다.
 */
const REGISTRY: ActivityDefinition[] = [
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
  {
    id: "chess",
    title: "체스",
    titleEn: "Chess",
    description: "FIDE 규칙 · 친구와 한 판",
    descriptionEn: "FIDE rules · play with a friend",
    icon: "♟",
    category: "game",
    minPlayers: 2,
    maxPlayers: 2,
    playable: true,
    minigameId: "chess",
  },
  {
    id: "omok",
    title: "오목",
    titleEn: "Omok",
    description: "15×15 · 5목",
    descriptionEn: "15×15 five-in-a-row",
    icon: "⚫",
    category: "game",
    minPlayers: 2,
    maxPlayers: 2,
    playable: true,
    minigameId: "omok",
  },
  {
    id: "draw-together",
    title: "같이 그리기",
    titleEn: "Draw Together",
    description: "스케치퀴즈 스타일 드로잉",
    descriptionEn: "Sketch together",
    icon: "🎨",
    category: "creative",
    minPlayers: 2,
    maxPlayers: 5,
    playable: true,
    minigameId: "sketch-quiz",
  },
  {
    id: "uno",
    title: "UNO",
    titleEn: "UNO",
    description: "곧 플레이 가능",
    descriptionEn: "Coming soon",
    icon: "🎮",
    category: "game",
    minPlayers: 2,
    maxPlayers: 6,
    playable: false,
  },
  {
    id: "mini-racing",
    title: "미니 레이싱",
    titleEn: "Mini Racing",
    description: "곧 플레이 가능",
    descriptionEn: "Coming soon",
    icon: "🏎",
    category: "game",
    minPlayers: 1,
    maxPlayers: 8,
    playable: false,
  },
  {
    id: "typing-race",
    title: "타이핑 레이스",
    titleEn: "Typing Race",
    description: "곧 플레이 가능",
    descriptionEn: "Coming soon",
    icon: "⌨️",
    category: "game",
    minPlayers: 2,
    maxPlayers: 8,
    playable: false,
  },
  {
    id: "quiz",
    title: "퀴즈",
    titleEn: "Quiz",
    description: "곧 플레이 가능",
    descriptionEn: "Coming soon",
    icon: "❓",
    category: "social",
    minPlayers: 2,
    maxPlayers: 20,
    playable: false,
  },
  {
    id: "watch-together",
    title: "같이 보기",
    titleEn: "Watch Together",
    description: "곧 플레이 가능",
    descriptionEn: "Coming soon",
    icon: "📺",
    category: "watch",
    minPlayers: 1,
    maxPlayers: 50,
    playable: false,
  },
  {
    id: "whiteboard",
    title: "화이트보드",
    titleEn: "Whiteboard",
    description: "곧 플레이 가능",
    descriptionEn: "Coming soon",
    icon: "📋",
    category: "creative",
    minPlayers: 1,
    maxPlayers: 20,
    playable: false,
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
