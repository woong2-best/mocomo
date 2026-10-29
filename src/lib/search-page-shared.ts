import type { SupportTierLevel } from "@prisma/client";

export const SEARCH_PAGE_FILTERS = ["top", "latest", "people", "media"] as const;
export type SearchPageFilter = (typeof SEARCH_PAGE_FILTERS)[number];

export function parseSearchPageFilter(raw?: string | null): SearchPageFilter {
  if (raw === "latest" || raw === "people" || raw === "media") return raw;
  return "top";
}

export type SearchPageUser = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  supportTierSent: SupportTierLevel;
  bio: string | null;
  postsLocked: boolean;
  isFollowing?: boolean;
  followsYou?: boolean;
};
