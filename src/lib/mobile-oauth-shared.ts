/**
 * Client-safe mobile OAuth helpers — no Node crypto / DB.
 * Server token sealing lives in `mobile-oauth-handoff.ts`.
 */

export const MOBILE_OAUTH_COOKIE = "mocomo_mobile_oauth";
export const MOBILE_OAUTH_REDIRECT_COOKIE = "mocomo_mobile_redirect";
export const MOBILE_OAUTH_PLATFORM_COOKIE = "mocomo_mobile_platform";
/** Last OAuth provider attempted from the app — used to continue signup after not_registered. */
export const MOBILE_OAUTH_PROVIDER_COOKIE = "mocomo_oauth_provider";
/** Sealed needsSignup handoff after Discord/X OAuth when no MoCoMo account exists. */
export const MOBILE_SIGNUP_HANDOFF_COOKIE = "mocomo_mobile_signup_handoff";
export const MOBILE_OAUTH_REDIRECT = "mocomo://oauth";

export function readMobilePlatformCookie(
  value: string | undefined | null
): "android" | "ios" {
  return value === "ios" ? "ios" : "android";
}

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

/**
 * Detect mobile AuthSession intent from an Auth.js callback-url value when
 * `mocomo_mobile_oauth` cookies were dropped (Discord/LINE app handoff).
 */
export function mobileOptsFromAuthCallbackUrl(
  raw?: string | null
): { platform: "android" | "ios"; redirectUri: string | null } | null {
  if (!raw?.trim()) return null;
  let decoded = raw.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    /* keep raw */
  }

  let pathname = decoded;
  let search = "";
  try {
    if (/^https?:\/\//i.test(decoded)) {
      const u = new URL(decoded);
      pathname = u.pathname;
      search = u.search;
    } else if (decoded.startsWith("/")) {
      const q = decoded.indexOf("?");
      pathname = q >= 0 ? decoded.slice(0, q) : decoded;
      search = q >= 0 ? decoded.slice(q) : "";
    } else {
      return null;
    }
  } catch {
    return null;
  }

  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const dest = params.get("dest") ?? "";
  const haystack = `${pathname}?${params.toString()}&dest=${dest}`;
  const isMobile =
    haystack.includes("/auth/mobile/") ||
    params.get("from") === "mobile" ||
    dest.includes("from=mobile") ||
    dest.includes("/auth/mobile/");
  if (!isMobile) return null;

  let platform: "android" | "ios" = "android";
  if (
    params.get("platform") === "ios" ||
    dest.includes("platform=ios") ||
    haystack.includes("platform=ios")
  ) {
    platform = "ios";
  }

  let redirectUri: string | null = null;
  const nestedRedirect =
    params.get("redirect_uri") ??
    (() => {
      try {
        const destParams = new URLSearchParams(dest.includes("?") ? dest.split("?")[1] : "");
        return destParams.get("redirect_uri");
      } catch {
        return null;
      }
    })();
  if (nestedRedirect) {
    redirectUri = sanitizeMobileRedirectUri(nestedRedirect);
  }

  return { platform, redirectUri };
}

/** Public mobile OAuth entry — Google only (live streaming connect is separate). */
export type MobileOAuthProvider = "gmail" | "google";

export function isMobileOAuthProvider(v: string): v is MobileOAuthProvider {
  return v === "gmail" || v === "google";
}
