/** 외부 example/placeholder 도메인 클릭 방지 → 내부 경로로 */

import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";

export const BLOCKED_HOSTS = ["example.com", "example.org", "example.net", "placehold.co"];

export function sanitizeAdLink(url: string): string {
  try {
    const u = new URL(url, "https://mocomo.local");
    if (BLOCKED_HOSTS.some((h) => u.hostname.endsWith(h))) {
      return DEFAULT_LANDING_PATH;
    }
    if (url.startsWith("/")) return url;
    return url;
  } catch {
    return DEFAULT_LANDING_PATH;
  }
}

export function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}
