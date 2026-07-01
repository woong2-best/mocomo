/** @deprecated src/lib/minigames/registry.ts 사용 */
import type { LucideIcon } from "lucide-react";
import { isAptPath } from "@/lib/apt-route";
import { getSortedLiveGamesForNav, isMinigamePath } from "@/lib/minigames/registry";

export type GameCatalogEntry = {
  id: string;
  name: string;
  href: string;
  icon: LucideIcon;
  description?: string;
};

export function getSortedGames(): GameCatalogEntry[] {
  return getSortedLiveGamesForNav().map((g) => ({
    id: g.id,
    name: g.name,
    href: g.href!,
    icon: g.icon,
    description: g.description,
  }));
}

export function isGamesPath(pathname: string): boolean {
  return isMinigamePath(pathname) || isAptPath(pathname);
}
