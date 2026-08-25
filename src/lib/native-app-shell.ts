/** Play Store / app.mocomo.net 전용 셸 — 하단 탭·FAB·간소 헤더 */

import { isUsedDetailPath } from "@/lib/mobile-shell";
import { APT_GAME_PATH, REELS_PATH } from "@/lib/site-routes";
import { isFastHubPath } from "@/lib/hub-fast-path";

export { isFastHubPath } from "@/lib/hub-fast-path";

/** @deprecated use isFastHubPath from @/lib/hub-fast-path */
export function isNativeTabRoot(pathname: string): boolean {
  return isFastHubPath(pathname);
}

export const NATIVE_APP_NAV_REM = "calc(92px + max(env(safe-area-inset-bottom, 0px), 8px))";

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
  if (pathname === REELS_PATH || pathname.startsWith(`${REELS_PATH}/`)) return true;
  if (isUsedDetailPath(pathname)) return true;
  return false;
}

export function shouldHideNativeAppHeader(pathname: string): boolean {
  if (pathname === "/discover") return true;
  if (/^\/messages\/[^/]+$/.test(pathname)) return true;
  if (isImmersiveGamePath(pathname)) return true;
  if (pathname === APT_GAME_PATH) return true;
  if (pathname === REELS_PATH || pathname.startsWith(`${REELS_PATH}/`)) return true;
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
