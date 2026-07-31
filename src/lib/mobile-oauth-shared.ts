/**
 * Client-safe mobile OAuth helpers — no Node crypto / DB.
 * Server token sealing lives in `mobile-oauth-handoff.ts`.
 */

export const MOBILE_OAUTH_COOKIE = "mocomo_mobile_oauth";
export const MOBILE_OAUTH_REDIRECT_COOKIE = "mocomo_mobile_redirect";
export const MOBILE_OAUTH_REDIRECT = "mocomo://oauth";

/** After web auth succeeds, land here to issue app tokens + deep-link back. */
export function mobileAuthCompletePath(platform: "android" | "ios" = "android") {
  return `/auth/mobile/oauth/complete?platform=${platform}&from=mobile`;
}

/** Allow only MoCoMo app / Expo auth-session return URLs. */
export function sanitizeMobileRedirectUri(raw?: string | null): string | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  const okScheme =
    u.protocol === "mocomo:" ||
    u.protocol === "exp:" ||
    u.protocol === "exps:" ||
    false;
  if (!okScheme) return null;
  u.searchParams.delete("handoff");
  return u.toString().replace(/\?$/, "");
}

export type MobileOAuthProvider = "discord" | "twitter" | "line" | "gmail" | "naver";

export function isMobileOAuthProvider(v: string): v is MobileOAuthProvider {
  return (
    v === "discord" ||
    v === "twitter" ||
    v === "line" ||
    v === "gmail" ||
    v === "naver"
  );
}
