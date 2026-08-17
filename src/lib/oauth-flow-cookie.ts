export const OAUTH_FLOW_COOKIE = "mocomo_oauth_flow";

export type OAuthFlow = "signin" | "signup";

/** Unregistered OAuth sign-in → always signup apply (addAccount flow). */
export const SIGNUP_APPLY_UNREGISTERED_PATH =
  "/auth/signup/apply?addAccount=1&reason=not_registered";

export function signupRedirectForUnregistered(): string {
  return SIGNUP_APPLY_UNREGISTERED_PATH;
}

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

/** @deprecated Use signupRedirectForUnregistered() — all unregistered OAuth → apply */
export function signupRedirectForOAuthEmail(_email: string | null | undefined): string {
  return signupRedirectForUnregistered();
}
