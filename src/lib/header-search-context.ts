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
  placeholder: string;
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
      placeholder: "어떤 상품을 찾으세요?",
      basePath: "/market",
      inPage: true,
    };
  }
  if (matchPath(path, "/market")) {
    return {
      scope: "market",
      placeholder: "어떤 상품을 찾으세요?",
      basePath: "/market",
      inPage: true,
    };
  }
  if (matchPath(path, "/live")) {
    return {
      scope: "live",
      placeholder: "스트리머 검색",
      basePath: "/live",
      inPage: true,
    };
  }
  if (matchPath(path, "/anime")) {
    return {
      scope: "wiki",
      placeholder: "컬쳐위키 검색 ( 제목 )",
      basePath: "/anime",
      inPage: true,
    };
  }
  if (path === "/communities" || path.startsWith("/communities/")) {
    return {
      scope: "community",
      placeholder: "커뮤니티 검색",
      basePath: "/communities",
      inPage: true,
    };
  }
  if (matchPath(path, "/feed")) {
    return {
      scope: "social",
      placeholder: "Search",
      basePath: "/feed",
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
      placeholder: "Search",
      basePath: "/search",
      inPage: false,
    };
  }

  return {
    scope: "global",
    placeholder: "Search",
    basePath: "/search",
    inPage: false,
  };
}
