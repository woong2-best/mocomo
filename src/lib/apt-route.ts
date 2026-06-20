import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";

export function isAptPath(pathname: string): boolean {
  return pathname === DEFAULT_LANDING_PATH || pathname.startsWith("/apt/");
}

/** 메인 APT 허브 — 전체화면 몰입 모드 (move-in·house 제외) */
export function isAptImmersivePath(pathname: string): boolean {
  return pathname === DEFAULT_LANDING_PATH || pathname === "/apt";
}
