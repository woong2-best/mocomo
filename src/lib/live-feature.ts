/** 라이브 방송 UI 노출 — 코드/API는 유지, 웹 버튼·페이지만 제어 */

export function isLiveFeatureEnabled(): boolean {
  return process.env.NEXT_PUBLIC_LIVE_ENABLED === "true";
}

export const LIVE_FEATURE_HREFS = ["/live", "/voice"] as const;

export function isLiveNavHref(href: string): boolean {
  return href === "/live" || href.startsWith("/voice");
}
