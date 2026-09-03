/**
 * APT game + in-game economy (gold shop, flea, player market) — public hold.
 * Code stays in repo; end users must not reach routes, links, or APIs.
 * Re-enable by setting APT_PUBLIC_ENABLED = true.
 */
export const APT_PUBLIC_ENABLED = false;

export const APT_PUBLIC_DISABLED_MSG =
  "APT is temporarily unavailable.";

export const APT_PUBLIC_DISABLED_MSG_KO =
  "APT 기능은 일시적으로 제공되지 않습니다.";

export function isAptPublicEnabled(): boolean {
  return APT_PUBLIC_ENABLED;
}

/** User-facing page/API paths blocked while APT is on hold (admin excluded). */
export function isAptPublicBlockedPath(pathname: string): boolean {
  if (isAptPublicEnabled()) return false;
  if (pathname.startsWith("/admin")) return false;

  if (pathname === "/play/house") return true;
  if (pathname === "/apt" || pathname.startsWith("/apt/")) return true;
  if (pathname.startsWith("/diorama/")) return true;

  if (pathname.startsWith("/api/apt/")) return true;
  if (pathname === "/api/economy/config") return true;

  return false;
}

export function aptPublicGuard(): { error: string } | null {
  if (isAptPublicEnabled()) return null;
  return { error: APT_PUBLIC_DISABLED_MSG_KO };
}
