import type { LucideIcon } from "lucide-react";
import { PencilLine } from "lucide-react";

export type GameCatalogEntry = {
  id: string;
  name: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

/** MoCoMo 독립 게임 목록 — ㄱ~ㅎ 가나다순 */
const GAMES: GameCatalogEntry[] = [
  {
    id: "sketch-quiz",
    name: "스케치퀴즈",
    href: "/sketch-quiz",
    icon: PencilLine,
    description: "그림 맞히기 · 친구 방 / 랜덤 매칭",
  },
];

export function getSortedGames(): GameCatalogEntry[] {
  return [...GAMES].sort((a, b) => a.name.localeCompare(b.name, "ko"));
}

export function isGamesPath(pathname: string): boolean {
  if (pathname === "/games") return true;
  return GAMES.some((g) => pathname === g.href || pathname.startsWith(`${g.href}/`));
}
