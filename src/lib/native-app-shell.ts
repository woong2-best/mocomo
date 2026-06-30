/** Play Store / app.mocomo.net 전용 셸 — 하단 탭·FAB·간소 헤더 */

import { isUsedDetailPath } from "@/lib/mobile-shell";
import { APT_GAME_PATH, DEFAULT_LANDING_PATH } from "@/lib/site-routes";

/** 하단 탭 루트 — 탭 간 전환 시 라우트 진입 애니 생략 */
export function isNativeTabRoot(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname === "/" || pathname === DEFAULT_LANDING_PATH || pathname === "/feed") return true;
  if (pathname === "/discover" || pathname === "/used" || pathname === "/games") return true;
  return /^\/u\/[^/]+$/.test(pathname);
}

export const NATIVE_APP_NAV_REM = "3.25rem";

function isImmersiveGamePath(pathname: string): boolean {
  return /^\/play\/[^/]+\/[^/]+$/.test(pathname) || /^\/sketch-quiz\/[^/]+$/.test(pathname);
}

export function shouldHideNativeAppNav(pathname: string): boolean {
  if (/^\/messages\/[^/]+$/.test(pathname)) return true;
  if (/^\/voice\/[^/]+$/.test(pathname) && pathname !== "/voice/new") return true;
  if (isImmersiveGamePath(pathname)) return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/legal")) return true;
  if (pathname === "/discover") return true;
  if (pathname === APT_GAME_PATH) return true;
  if (isUsedDetailPath(pathname)) return true;
  return false;
}

export function shouldHideNativeAppHeader(pathname: string): boolean {
  if (pathname === "/discover") return true;
  if (/^\/messages\/[^/]+$/.test(pathname)) return true;
  if (isImmersiveGamePath(pathname)) return true;
  if (pathname === APT_GAME_PATH) return true;
  return false;
}

export function shouldHideNativeComposeFab(pathname: string): boolean {
  if (pathname === "/used" || pathname.startsWith("/used/")) return true;
  if (shouldHideNativeAppNav(pathname)) return true;
  return false;
}

export function nativeAppMainPadding(pathname: string): string {
  if (shouldHideNativeAppNav(pathname)) return "pb-safe";
  if (shouldHideNativeComposeFab(pathname)) return "pb-native-nav";
  return "pb-native-fab";
}
