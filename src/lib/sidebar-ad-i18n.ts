import type { MessageKey } from "@/lib/i18n/messages";

function normalizeAdPath(linkUrl: string): string {
  try {
    const url = new URL(linkUrl, "https://mocomo.local");
    return url.pathname.replace(/\/$/, "") || "/";
  } catch {
    return linkUrl.split("?")[0]?.replace(/\/$/, "") || "/";
  }
}

/** DB 시드·폴백 광고 — 표시 시 locale로 제목 치환 */
export function sidebarAdTitleKey(linkUrl: string): MessageKey | null {
  const path = normalizeAdPath(linkUrl);
  if (path === "/events" || path === "/events/map") return "sidebar.fallbackEventAd";
  return null;
}

export function localizeSidebarAdTitle(
  ad: { title: string; linkUrl: string },
  t: (key: MessageKey, vars?: Record<string, string>) => string
): string {
  const key = sidebarAdTitleKey(ad.linkUrl);
  return key ? t(key) : ad.title;
}
