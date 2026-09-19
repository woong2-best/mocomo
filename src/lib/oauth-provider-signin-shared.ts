import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import type { OAuthFlow } from "@/lib/oauth-flow-cookie";
import { mobileAuthCompletePath, sanitizeMobileRedirectUri } from "@/lib/mobile-oauth-shared";

/** Public MoCoMo login/signup — Google only (live streaming OAuth is separate). */
export const OAUTH_PROVIDER_IDS = ["google"] as const;
export type OAuthProviderId = (typeof OAUTH_PROVIDER_IDS)[number];

export function isOAuthProviderId(value: string): value is OAuthProviderId {
  return (OAUTH_PROVIDER_IDS as readonly string[]).includes(value);
}

export function safeOAuthDestination(raw: string | null | undefined): string {
  const path = raw?.trim() ?? "";
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return DEFAULT_LANDING_PATH;
}

export function oauthRedirectTo(
  flow: OAuthFlow,
  finalDestination: string,
  opts?: { addAccount?: boolean }
): string {
  const params = new URLSearchParams({
    dest: finalDestination,
    flow,
  });
  if (opts?.addAccount) params.set("addAccount", "1");
  return `/auth/oauth/complete?${params}`;
}

export type StartOAuthProviderSigninOptions = {
  provider: OAuthProviderId;
  flow: OAuthFlow;
  callbackUrl: string | null | undefined;
  addAccount?: boolean;
  mobile?: boolean;
  platform?: "android" | "ios";
  redirectUri?: string | null;
  /** Google account chooser. Default true; set false when continuing signup after not_registered. */
  selectAccount?: boolean;
};

export function buildProviderSigninHref(
  provider: OAuthProviderId,
  opts: {
    flow: OAuthFlow;
    callbackUrl: string;
    addAccount?: boolean;
    mobile?: boolean;
    platform?: "android" | "ios";
    redirectUri?: string | null;
    selectAccount?: boolean;
  }
): string {
  const params = new URLSearchParams({
    provider,
    flow: opts.flow,
    callbackUrl: opts.callbackUrl,
  });
  if (opts.addAccount) params.set("addAccount", "1");
  if (opts.selectAccount === false) params.set("selectAccount", "0");
  if (opts.mobile) {
    params.set("platform", opts.platform === "ios" ? "ios" : "android");
    if (opts.redirectUri) params.set("redirect_uri", opts.redirectUri);
    return `/api/auth/mobile/provider-signin?${params}`;
  }
  return `/api/auth/provider-signin?${params}`;
}

export function resolveOAuthProviderSignin(opts: StartOAuthProviderSigninOptions): {
  finalDestination: string;
  redirectTo: string;
  redirectUri: string | null;
} {
  const platform = opts.platform === "ios" ? "ios" : "android";
  const finalDestination = opts.mobile
    ? safeOAuthDestination(opts.callbackUrl?.trim() || mobileAuthCompletePath(platform))
    : safeOAuthDestination(opts.callbackUrl);
  const redirectTo = oauthRedirectTo(opts.flow, finalDestination, {
    addAccount: opts.addAccount,
  });
  const redirectUri = sanitizeMobileRedirectUri(opts.redirectUri ?? null);
  return { finalDestination, redirectTo, redirectUri };
}
