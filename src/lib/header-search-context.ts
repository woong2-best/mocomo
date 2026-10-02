import { isCommunityFeedPath } from "@/lib/site-routes";
import type { MessageKey } from "@/lib/i18n/message-keys";

export type HeaderSearchScope =
  | "global"
  | "social"
  | "used"
  | "market"
  | "live"
  | "wiki"
  | "community";

export type HeaderSearchContext = {
  scope: HeaderSearchScope;
  placeholderKey: MessageKey;
  basePath: string;
  /** Stay on the current section via ?q= instead of /search */
  inPage: boolean;
};

function matchPath(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}

/** Resolve header search behavior from the current route. */
export function getHeaderSearchContext(pathname: string): HeaderSearchContext {
  const path = pathname.split("?")[0] || "/";

  if (matchPath(path, "/market")) {
    return {
      scope: "used",
      placeholderKey: "search.headerPlaceholder.market",
      basePath: "/market",
      inPage: true,
    };
  }
  if (matchPath(path, "/market")) {
    return {
      scope: "market",
      placeholderKey: "search.headerPlaceholder.market",
      basePath: "/market",
      inPage: true,
    };
  }
  if (matchPath(path, "/live")) {
    return {
      scope: "live",
      placeholderKey: "search.headerPlaceholder.live",
      basePath: "/live",
      inPage: true,
    };
  }
  if (matchPath(path, "/anime")) {
    return {
      scope: "wiki",
      placeholderKey: "search.headerPlaceholder.wiki",
      basePath: "/anime",
      inPage: true,
    };
  }
  if (path === "/communities" || path.startsWith("/communities/")) {
    return {
      scope: "community",
      placeholderKey: "search.headerPlaceholder.community",
      basePath: "/communities",
      inPage: true,
    };
  }
  if (isCommunityFeedPath(path)) {
    return {
      scope: "social",
      placeholderKey: "search.headerPlaceholder.global",
      basePath: "/",
      inPage: true,
    };
  }
  if (
    matchPath(path, "/messages") ||
    matchPath(path, "/star") ||
    matchPath(path, "/wallet")
  ) {
    return {
      scope: "social",
      placeholderKey: "search.headerPlaceholder.global",
      basePath: "/search",
      inPage: false,
    };
  }

  return {
    scope: "global",
    placeholderKey: "search.headerPlaceholder.global",
    basePath: "/search",
    inPage: false,
  };
}
