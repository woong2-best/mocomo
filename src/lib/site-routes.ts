/** 사이트 기본 랜딩 — 홈 피드 (루트 도메인) */
export const DEFAULT_LANDING_PATH = "/";

/** 탐색 · 발견 */
export const EXPLORE_PATH = "/explore";

/** 세로 숏폼 영상 피드 (Reels) */
export const REELS_PATH = "/reels";

/** APT 집 · 다이오라마 게임 (구 /apt 메인) — @see apt-public-gate (보류 시 비공개) */
export const APT_GAME_PATH = "/play/house";

/** 커뮤니티 피드 경로 (과거 /feed — revalidate·탭 매칭용) */
export const COMMUNITY_FEED_PATH = "/";

/** 홈 피드 URL (루트 또는 레거시 /feed) */
export function isCommunityFeedPath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname === "/" || pathname === "/feed") return true;
  return pathname.startsWith("/feed/");
}
