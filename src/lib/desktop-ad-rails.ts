/** 데스크톱 좌·우 여백 광고 레일 — 본문 피드와 분리 */
export function shouldShowDesktopAdRails(pathname: string): boolean {
  if (pathname.startsWith("/auth")) return false;
  if (pathname.startsWith("/legal")) return false;
  if (pathname.startsWith("/live")) return false;
  if (pathname.startsWith("/messages")) return false;
  if (pathname.startsWith("/used")) return false;
  if (pathname.startsWith("/voice/") && pathname !== "/voice/new") return false;
  return true;
}
