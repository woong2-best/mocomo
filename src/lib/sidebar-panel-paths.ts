/** 우측 패널(광고·애니·후원 랭킹)을 불러올 경로 — 나머지는 DB 요청 생략 */
export function isAvatarStudioPath(pathname: string): boolean {
  return pathname.startsWith("/avatar/studio");
}

export function isWebtoonDrawStudioPath(pathname: string): boolean {
  return pathname.startsWith("/webtoon/studio/draw");
}

/** 프로필 홈 — 달력·팔로우 추천 전용 우측 패널 (광고·랭킹 DB 생략) */
export function isProfilePath(pathname: string): boolean {
  return pathname.startsWith("/u/");
}

export function shouldShowRightPanel(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/auth")) return false;
  if (pathname.startsWith("/legal")) return false;
  if (pathname.startsWith("/live")) return false;
  if (pathname.startsWith("/games")) return false;
  if (pathname.startsWith("/rankings")) return false;
  if (pathname.startsWith("/notifications")) return false;
  if (pathname.startsWith("/search")) return false;
  if (pathname === "/voice") return false;
  if (isAvatarStudioPath(pathname)) return false;
  if (isWebtoonDrawStudioPath(pathname)) return false;
  if (pathname.startsWith("/messages")) return false;
  if (/^\/c\/[^/]+/.test(pathname)) return false;
  if (pathname.startsWith("/apt")) return false;
  if (pathname.startsWith("/voice/") && pathname !== "/voice/new") return false;
  return true;
}

/** 광고·검색 랭킹 등 기본 우측 패널 (프로필은 전용 패널) */
export function shouldShowDefaultRightPanel(pathname: string): boolean {
  return shouldShowRightPanel(pathname) && !isProfilePath(pathname);
}
