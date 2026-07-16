/** 우측 패널(광고·애니·후원 랭킹)을 불러올 경로 — 나머지는 DB 요청 생략 */
export function isAvatarStudioPath(pathname: string): boolean {
  return pathname.startsWith("/avatar/studio");
}

export function isWebtoonDrawStudioPath(pathname: string): boolean {
  return pathname.startsWith("/webtoon/studio/draw");
}

export function shouldShowRightPanel(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return false;
  if (pathname.startsWith("/auth")) return false;
  if (pathname.startsWith("/legal")) return false;
  if (pathname.startsWith("/live")) return false;
  if (pathname.startsWith("/games")) return false;
  if (pathname.startsWith("/discover")) return false;
  if (pathname.startsWith("/rankings")) return false;
  if (pathname.startsWith("/notifications")) return false;
  if (pathname.startsWith("/search")) return false;
  if (pathname === "/voice") return false;
  if (isAvatarStudioPath(pathname)) return false;
  if (isWebtoonDrawStudioPath(pathname)) return false;
  if (pathname.startsWith("/messages")) return false;
  if (/^\/c\/[^/]+/.test(pathname)) return false;
  if (pathname.startsWith("/used")) return false;
  if (pathname.startsWith("/apt")) return false;
  if (pathname.startsWith("/u/")) return false;
  if (pathname.startsWith("/voice/") && pathname !== "/voice/new") return false;
  return true;
}
