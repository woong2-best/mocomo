import { APT_GAME_PATH } from "@/lib/site-routes";

export function isAptPath(pathname: string): boolean {
  return pathname === APT_GAME_PATH || pathname.startsWith("/apt/");
}

/** 집 게임 — 전체화면 몰입 모드 */
export function isAptImmersivePath(pathname: string): boolean {
  return pathname === APT_GAME_PATH;
}
