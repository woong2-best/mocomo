/** Floating glass pill tab bar — parity with apps/mobile tab-layout.ts */

export const FLOATING_TAB = {
  heightPx: 68,
  horizontalInsetPx: 22,
  bottomGapPx: 10,
  extraClearancePx: 14,
  radiusPx: 34,
} as const;

export function floatingTabClearanceCss(): string {
  const base =
    FLOATING_TAB.heightPx +
    FLOATING_TAB.bottomGapPx +
    FLOATING_TAB.extraClearancePx;
  return `calc(${base}px + max(env(safe-area-inset-bottom, 0px), 8px))`;
}

/** Primary app tabs — 홈 · 마켓 · 중고 · 메세지 (RN parity) */
export const MOBILE_PRIMARY_TAB_HREFS = ["/feed", "/market", "/used", "/messages"] as const;

export function isMobilePrimaryTabPath(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname === "/feed" || pathname.startsWith("/feed/")) return true;
  if (pathname === "/market" || pathname.startsWith("/market/")) return true;
  if (pathname === "/used" || pathname.startsWith("/used/")) return true;
  if (pathname === "/messages") return true;
  return false;
}

/** Hub screens use feed-style header strip on mobile web. */
export function isMobileHubChromePath(pathname: string): boolean {
  return isMobilePrimaryTabPath(pathname);
}
