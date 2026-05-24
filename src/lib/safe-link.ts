/** 외부 example/placeholder 도메인 클릭 방지 → 내부 경로로 */

const BLOCKED_HOSTS = ["example.com", "example.org", "example.net", "placehold.co"];

export function sanitizeAdLink(url: string): string {
  try {
    const u = new URL(url, "https://mocomo.local");
    if (BLOCKED_HOSTS.some((h) => u.hostname.endsWith(h))) {
      return "/explore";
    }
    if (url.startsWith("/")) return url;
    return url;
  } catch {
    return "/explore";
  }
}

export function isExternalUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}
