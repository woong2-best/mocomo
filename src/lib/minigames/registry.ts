import {
  Circle,
  Grid3X3,
  PencilLine,
  Puzzle,
  Shapes,
  Sparkles,
  Type,
  Zap,
  Music,
  Car,
  Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MinigameCategory, MinigameDefinition, MinigameStatus } from "./types";
import { getMinigameRoute } from "./game-meta";

export type MinigameCatalogItem = MinigameDefinition & {
  icon: LucideIcon;
};

function live(id: string, overrides: Partial<MinigameCatalogItem> & Pick<MinigameCatalogItem, "name" | "category" | "description" | "minPlayers" | "maxPlayers">): MinigameCatalogItem {
  const icons: Record<string, LucideIcon> = {
    "sketch-quiz": PencilLine,
    "word-chain": Type,
    "chosung-quiz": Sparkles,
    "word-guess": Type,
    omok: Grid3X3,
    chess: Shapes,
    janggi: Shapes,
    alkkagi: Circle,
    baduk: Grid3X3,
    reversi: Circle,
    jigsaw: Puzzle,
    "slide-puzzle": Puzzle,
    "picture-match": Puzzle,
    "spot-diff": Puzzle,
    "piano-rush": Music,
    "parking-rush": Car,
    "tower-rush": Layers,
    rps: Zap,
    "number-guess": Zap,
    "memory-cards": Zap,
  };
  return {
    id,
    status: "live",
    href: getMinigameRoute(id),
    icon: icons[id] ?? Puzzle,
    supportsSpectate: true,
    supportsRanked: true,
    supportsReplay: true,
    ...overrides,
  } as MinigameCatalogItem;
}

/** 플러그인 레지스트리 — 새 게임은 여기에 추가만 하면 허브·매칭·랭킹에 연결 가능 */
const REGISTRY: MinigameCatalogItem[] = [
  live("sketch-quiz", {
    name: "스케치퀴즈",
    category: "word",
    description: "그림으로 맞히는 캐치마인드 · 친구 방 / 랜덤 매칭",
    minPlayers: 2,
    maxPlayers: 5,
    supportsSpectate: false,
    supportsRanked: false,
    supportsReplay: false,
  }),
  live("word-chain", {
    name: "끝말잇기",
    category: "word",
    description: "국어사전 검증 · 실시간 턴제",
    minPlayers: 2,
    maxPlayers: 8,
  }),
  live("chosung-quiz", {
    name: "초성퀴즈",
    category: "word",
    description: "초성으로 단어 맞히기 · 5라운드",
    minPlayers: 2,
    maxPlayers: 8,
    supportsReplay: false,
  }),
  live("word-guess", {
    name: "단어 맞추기",
    category: "word",
    description: "힌트·피드백 단어 퀴즈",
    minPlayers: 2,
    maxPlayers: 6,
    supportsRanked: false,
    supportsReplay: false,
  }),
  live("omok", {
    name: "오목",
    category: "board",
    description: "15×15 · 5목 승리 · 관전",
    minPlayers: 2,
    maxPlayers: 2,
  }),
  live("chess", {
    name: "체스",
    category: "board",
    description: "FIDE 규칙 · 블리츠/인크 · 무승부·50수 · 퍼즐 · a1~h8",
    minPlayers: 2,
    maxPlayers: 2,
  }),
  live("janggi", {
    name: "장기",
    category: "board",
    description: "한국 장기 · 9×10 · 장군 · 턴 타이머",
    minPlayers: 2,
    maxPlayers: 2,
  }),
  live("alkkagi", {
    name: "알까기",
    category: "board",
    description: "물리 시뮬 · 드래그 발사",
    minPlayers: 2,
    maxPlayers: 2,
  }),
  live("baduk", {
    name: "바둑",
    category: "board",
    description: "19×19 · 따내기 · 패 · 집 계산 · 30초 턴",
    minPlayers: 2,
    maxPlayers: 2,
  }),
  live("reversi", {
    name: "리버시",
    category: "board",
    description: "8×8 오셀로 · 8방향 뒤집기 · 자동 패스 · 돌 개수 승패",
    minPlayers: 2,
    maxPlayers: 2,
  }),
  live("jigsaw", {
    name: "직소 퍼즐",
    category: "puzzle",
    description: "4×4 조각 맞추기",
    minPlayers: 1,
    maxPlayers: 4,
    supportsRanked: false,
  }),
  live("slide-puzzle", {
    name: "슬라이드 퍼즐",
    category: "puzzle",
    description: "15-puzzle · 최단 기록",
    minPlayers: 1,
    maxPlayers: 2,
    supportsSpectate: false,
  }),
  live("picture-match", {
    name: "그림 맞추기",
    category: "puzzle",
    description: "메모리 카드 6쌍",
    minPlayers: 2,
    maxPlayers: 4,
    supportsRanked: false,
    supportsReplay: false,
  }),
  live("spot-diff", {
    name: "틀린 그림 찾기",
    category: "puzzle",
    description: "이미지 14종 · 무한 · 대결/협동 · 클리어 랭킹",
    minPlayers: 1,
    maxPlayers: 8,
    supportsRanked: true,
    supportsReplay: false,
  }),
  live("piano-rush", {
    name: "피아노 러쉬",
    category: "casual",
    description: "PD 클래식 8곡 · Beethoven·Bach·Mozart · 1:1·배틀·싱글 · 서버 판정",
    minPlayers: 1,
    maxPlayers: 50,
    supportsRanked: true,
    supportsReplay: false,
  }),
  live("parking-rush", {
    name: "주차 러쉬",
    category: "casual",
    description: "로우폴리 3D 주차 · 최대 16인 · 싱글·대전·랭크 · PC·모바일",
    minPlayers: 1,
    maxPlayers: 16,
    supportsRanked: true,
    supportsReplay: true,
  }),
  live("tower-rush", {
    name: "타워 러쉬",
    category: "casual",
    description: "블록 타이밍 쌓기 · Perfect 정렬 · 50인 배틀로얄 · PC·모바일·태블릿",
    minPlayers: 1,
    maxPlayers: 50,
    supportsRanked: true,
    supportsReplay: true,
  }),
  live("rps", {
    name: "가위바위보",
    category: "casual",
    description: "3판 2선승",
    minPlayers: 2,
    maxPlayers: 8,
    supportsRanked: false,
    supportsReplay: false,
  }),
  live("number-guess", {
    name: "숫자 맞추기",
    category: "casual",
    description: "UP/DOWN · 1~100",
    minPlayers: 2,
    maxPlayers: 6,
    supportsRanked: false,
    supportsReplay: false,
  }),
  live("memory-cards", {
    name: "카드 뒤집기",
    category: "casual",
    description: "8쌍 메모리 대결",
    minPlayers: 2,
    maxPlayers: 4,
    supportsRanked: false,
  }),
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
  if (pathname.startsWith("/play/")) return true;
  return REGISTRY.some(
    (g) => g.href && (pathname === g.href || pathname.startsWith(`${g.href}/`))
  );
}
