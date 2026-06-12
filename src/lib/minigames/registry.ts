import {
  Circle,
  Grid3X3,
  PencilLine,
  Puzzle,
  Shapes,
  Sparkles,
  Type,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MinigameCategory, MinigameDefinition, MinigameStatus } from "./types";

export type MinigameCatalogItem = MinigameDefinition & {
  icon: LucideIcon;
};

/** 플러그인 레지스트리 — 새 게임은 여기에 추가만 하면 허브·매칭·랭킹에 연결 가능 */
const REGISTRY: MinigameCatalogItem[] = [
  // ── 단어 (live) ──
  {
    id: "sketch-quiz",
    name: "스케치퀴즈",
    category: "word",
    status: "live",
    href: "/sketch-quiz",
    icon: PencilLine,
    description: "그림으로 맞히는 캐치마인드 · 친구 방 / 랜덤 매칭",
    minPlayers: 2,
    maxPlayers: 5,
    supportsSpectate: false,
    supportsRanked: false,
    supportsReplay: false,
  },
  {
    id: "word-chain",
    name: "끝말잇기",
    category: "word",
    status: "live",
    href: "/word-chain",
    icon: Type,
    description: "국어사전 검증 · 실시간 턴제",
    minPlayers: 2,
    maxPlayers: 8,
    supportsSpectate: true,
    supportsRanked: true,
    supportsReplay: true,
  },
  {
    id: "chosung-quiz",
    name: "초성퀴즈",
    category: "word",
    status: "coming_soon",
    icon: Sparkles,
    description: "초성으로 단어 맞히기",
    minPlayers: 2,
    maxPlayers: 8,
    supportsSpectate: true,
    supportsRanked: true,
    supportsReplay: false,
  },
  {
    id: "word-guess",
    name: "단어 맞추기",
    category: "word",
    status: "coming_soon",
    icon: Type,
    description: "힌트·시간제한 단어 퀴즈",
    minPlayers: 2,
    maxPlayers: 6,
    supportsSpectate: true,
    supportsRanked: false,
    supportsReplay: false,
  },
  // ── 보드 ──
  {
    id: "omok",
    name: "오목",
    category: "board",
    status: "live",
    href: "/omok",
    icon: Grid3X3,
    description: "15×15 · 렌주/자유룰 · 자동 승리 판정",
    minPlayers: 2,
    maxPlayers: 2,
    supportsSpectate: true,
    supportsRanked: true,
    supportsReplay: true,
  },
  {
    id: "chess",
    name: "체스",
    category: "board",
    status: "coming_soon",
    icon: Shapes,
    description: "FIDE 규칙 · 기보 · 시간제",
    minPlayers: 2,
    maxPlayers: 2,
    supportsSpectate: true,
    supportsRanked: true,
    supportsReplay: true,
  },
  {
    id: "janggi",
    name: "장기",
    category: "board",
    status: "coming_soon",
    icon: Shapes,
    description: "한국 장기 · 초/한 차림",
    minPlayers: 2,
    maxPlayers: 2,
    supportsSpectate: true,
    supportsRanked: true,
    supportsReplay: true,
  },
  {
    id: "alkkagi",
    name: "알까기",
    category: "board",
    status: "coming_soon",
    icon: Circle,
    description: "물리 엔진 · 드래그 발사",
    minPlayers: 2,
    maxPlayers: 2,
    supportsSpectate: true,
    supportsRanked: true,
    supportsReplay: true,
  },
  {
    id: "baduk",
    name: "바둑",
    category: "board",
    status: "coming_soon",
    icon: Grid3X3,
    description: "19×19 · 집 계산 · 기보",
    minPlayers: 2,
    maxPlayers: 2,
    supportsSpectate: true,
    supportsRanked: true,
    supportsReplay: true,
  },
  {
    id: "reversi",
    name: "리버시",
    category: "board",
    status: "coming_soon",
    icon: Circle,
    description: "오셀로 · 8×8",
    minPlayers: 2,
    maxPlayers: 2,
    supportsSpectate: true,
    supportsRanked: true,
    supportsReplay: true,
  },
  // ── 퍼즐 ──
  {
    id: "jigsaw",
    name: "직소 퍼즐",
    category: "puzzle",
    status: "coming_soon",
    icon: Puzzle,
    description: "협동/대결 · 난이도·조각 수",
    minPlayers: 1,
    maxPlayers: 4,
    supportsSpectate: true,
    supportsRanked: false,
    supportsReplay: true,
  },
  {
    id: "slide-puzzle",
    name: "슬라이드 퍼즐",
    category: "puzzle",
    status: "coming_soon",
    icon: Puzzle,
    description: "15-puzzle · 최단 기록",
    minPlayers: 1,
    maxPlayers: 2,
    supportsSpectate: false,
    supportsRanked: true,
    supportsReplay: true,
  },
  {
    id: "picture-match",
    name: "그림 맞추기",
    category: "puzzle",
    status: "coming_soon",
    icon: Puzzle,
    description: "카드 뒤집기 메모리",
    minPlayers: 1,
    maxPlayers: 4,
    supportsSpectate: true,
    supportsRanked: false,
    supportsReplay: false,
  },
  {
    id: "spot-diff",
    name: "틀린 그림 찾기",
    category: "puzzle",
    status: "coming_soon",
    icon: Puzzle,
    description: "차이점 찾기 · 시간 경쟁",
    minPlayers: 1,
    maxPlayers: 4,
    supportsSpectate: true,
    supportsRanked: true,
    supportsReplay: false,
  },
  // ── 캐주얼 ──
  {
    id: "rps",
    name: "가위바위보",
    category: "casual",
    status: "live",
    href: "/rps",
    icon: Zap,
    description: "베스트 오브 · 토너먼트",
    minPlayers: 2,
    maxPlayers: 8,
    supportsSpectate: true,
    supportsRanked: false,
    supportsReplay: false,
  },
  {
    id: "number-guess",
    name: "숫자 맞추기",
    category: "casual",
    status: "coming_soon",
    icon: Zap,
    description: "업다운 · 범위 축소",
    minPlayers: 2,
    maxPlayers: 6,
    supportsSpectate: true,
    supportsRanked: false,
    supportsReplay: false,
  },
  {
    id: "memory-cards",
    name: "카드 뒤집기",
    category: "casual",
    status: "coming_soon",
    icon: Zap,
    description: "짝 맞추기 · 멀티 대결",
    minPlayers: 2,
    maxPlayers: 4,
    supportsSpectate: true,
    supportsRanked: false,
    supportsReplay: true,
  },
];

export function getAllMinigames(): MinigameCatalogItem[] {
  return [...REGISTRY];
}

export function getMinigameById(id: string): MinigameCatalogItem | undefined {
  return REGISTRY.find((g) => g.id === id);
}

export function getLiveMinigames(): MinigameCatalogItem[] {
  return REGISTRY.filter((g) => g.status === "live" || g.status === "beta");
}

export function getMinigamesByCategory(category: MinigameCategory): MinigameCatalogItem[] {
  return REGISTRY.filter((g) => g.category === category).sort((a, b) =>
    a.name.localeCompare(b.name, "ko")
  );
}

export function getSortedLiveGamesForNav(): MinigameCatalogItem[] {
  return getLiveMinigames()
    .filter((g) => g.href)
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export function countByStatus(status: MinigameStatus): number {
  return REGISTRY.filter((g) => g.status === status).length;
}

export function isMinigamePath(pathname: string): boolean {
  if (pathname === "/games" || pathname.startsWith("/games/")) return true;
  return REGISTRY.some(
    (g) => g.href && (pathname === g.href || pathname.startsWith(`${g.href}/`))
  );
}
