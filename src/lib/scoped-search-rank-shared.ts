import { getHeaderSearchContext } from "@/lib/header-search-context";

export const SIDEBAR_SEARCH_RANKING_LIMIT = 5;

export type SidebarSearchRankingScope =
  | "used"
  | "market"
  | "community"
  | "feed"
  | "live"
  | "wiki"
  | "global";

export type SidebarSearchRankingItem = {
  rank: number;
  id: string;
  label: string;
  count: number;
};

/** Resolve sidebar ranking bucket from pathname. */
export function getSidebarSearchRankingScope(pathname: string): SidebarSearchRankingScope {
  const ctx = getHeaderSearchContext(pathname);
  if (ctx.scope === "wiki") return "wiki";
  if (ctx.scope === "used") return "used";
  if (ctx.scope === "market") return "market";
  if (ctx.scope === "community") return "community";
  if (ctx.scope === "live") return "live";
  if (ctx.scope === "social" && ctx.inPage) return "feed";
  if (ctx.scope === "social") return "feed";
  return "global";
}

export function searchRankingHref(scope: SidebarSearchRankingScope, label: string): string {
  const q = encodeURIComponent(label);
  switch (scope) {
    case "used":
      return `/used?q=${q}`;
    case "market":
      return `/market?q=${q}`;
    case "community":
      return `/communities?q=${q}`;
    case "live":
      return `/live?q=${q}`;
    case "wiki":
      return `/anime?q=${q}`;
    case "feed":
      return `/feed?q=${q}`;
    default:
      return `/search?q=${q}`;
  }
}
