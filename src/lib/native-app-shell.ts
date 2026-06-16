/** Play Store / app.mocomo.net 전용 셸 — 하단 탭·FAB·간소 헤더 */

export const NATIVE_APP_NAV_REM = "3.25rem";

export function shouldHideNativeAppNav(pathname: string): boolean {
  if (/^\/messages\/[^/]+$/.test(pathname)) return true;
  if (/^\/voice\/[^/]+$/.test(pathname) && pathname !== "/voice/new") return true;
  if (pathname.startsWith("/auth")) return true;
  if (pathname.startsWith("/legal")) return true;
  return false;
}

export function nativeAppMainPadding(pathname: string): string {
  if (shouldHideNativeAppNav(pathname)) return "pb-safe";
  return "pb-native-nav";
}
