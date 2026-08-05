export const OAUTH_FLOW_COOKIE = "mocomo_oauth_flow";

export type OAuthFlow = "signin" | "signup";

export function setOAuthFlowCookieClient(flow: OAuthFlow): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${OAUTH_FLOW_COOKIE}=${flow}; Path=/; Max-Age=1800; SameSite=Lax${secure}`;
}

/** Server httpOnly cookie — preferred before OAuth redirect. */
export async function persistOAuthFlowIntent(flow: OAuthFlow): Promise<void> {
  await fetch(`/api/auth/oauth-intent?flow=${flow}`, { credentials: "include" });
}

export async function readOAuthFlowCookie(): Promise<OAuthFlow | null> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const value = jar.get(OAUTH_FLOW_COOKIE)?.value;
  if (value === "signin" || value === "signup") return value;
  return null;
}

/** Unregistered OAuth email on sign-in → domain-specific signup route. */
export function signupRedirectForOAuthEmail(email: string | null | undefined): string {
  const normalized = email?.trim().toLowerCase();
  const params = new URLSearchParams({ reason: "not_registered" });
  if (!normalized) return `/auth/signup/apply?${params}`;

  if (normalized.endsWith("@gmail.com") || normalized.endsWith("@googlemail.com")) {
    params.set("email", normalized);
    return `/auth/signup/gmail?${params}`;
  }
  if (normalized.endsWith("@naver.com")) {
    params.set("email", normalized);
    return `/auth/signup/naver?${params}`;
  }

  params.set("email", normalized);
  return `/auth/signup/apply?${params}`;
}
