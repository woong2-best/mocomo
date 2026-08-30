import { DEFAULT_LANDING_PATH, EXPLORE_PATH } from "@/lib/site-routes";

/** 자주 오가는 허브 — 탭/사이드바 간 전환 시 라우트 애니 생략 */
export function isFastHubPath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname === "/" || pathname === DEFAULT_LANDING_PATH || pathname === "/feed") return true;
  if (pathname === EXPLORE_PATH || pathname === "/discover") return true;
  if (pathname === "/games" || pathname === "/used") return true;
  if (pathname === "/market" || pathname === "/messages") return true;
  if (pathname === "/rankings" || pathname === "/notifications") return true;
  if (pathname === "/voice" || pathname === "/live") return true;
  if (pathname === "/search" || pathname === "/communities") return true;
  if (pathname === "/star" || pathname === "/anime") return true;
  if (pathname === "/wallet" || pathname === "/settings") return true;
  return /^\/u\/[^/]+$/.test(pathname);
}

const REALTIME_PREFIXES = [
  "/messages",
  "/c/",
  "/games",
  "/play/",
  "/sketch-quiz",
  "/voice",
  "/live",
  "/apt",
  "/call",
] as const;

/** 소켓·실시간이 필요한 경로 — 나머지는 연결 지연 */
export function needsImmediateRealtime(pathname: string): boolean {
  if (!pathname) return false;
  return REALTIME_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p)
  );
}
