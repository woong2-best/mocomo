export const OAUTH_FLOW_COOKIE = "mocomo_oauth_flow";

export type OAuthFlow = "signin" | "signup";

export type SignupRedirectMobileOpts = {
  platform?: "android" | "ios";
  redirectUri?: string | null;
};

/** Unregistered OAuth sign-in → unified auth (preserve addAccount + mobile AuthSession). */
export function signupRedirectForUnregistered(
  addAccount = false,
  reason = "not_registered",
  mobile?: SignupRedirectMobileOpts | null
): string {
  const params = new URLSearchParams({ reason, intent: "signup" });
  if (addAccount) params.set("addAccount", "1");
  if (mobile) {
    params.set("from", "mobile");
    params.set("platform", mobile.platform === "ios" ? "ios" : "android");
    const redirectUri = mobile.redirectUri?.trim();
    if (redirectUri) params.set("redirect_uri", redirectUri);
  }
  return `/auth/signin?${params.toString()}`;
}

export function signupRedirectForExistingAccount(
  addAccount = false,
  mobile?: SignupRedirectMobileOpts | null
): string {
  return signupRedirectForUnregistered(addAccount, "account_exists", mobile);
}

export function signupRedirectForStaleSession(
  addAccount = false,
  mobile?: SignupRedirectMobileOpts | null
): string {
  return signupRedirectForUnregistered(addAccount, "same_account", mobile);
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

/** @deprecated Use signupRedirectForUnregistered() — all unregistered OAuth → /auth/signin */
export function signupRedirectForOAuthEmail(_email: string | null | undefined): string {
  return signupRedirectForUnregistered();
}
