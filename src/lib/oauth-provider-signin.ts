import { cookies } from "next/headers";
import { signIn, signOut } from "@/lib/auth";
import { ADD_ACCOUNT_COOKIE } from "@/lib/account-switch/constants";
import { clearAllSessionCookies } from "@/lib/account-switch/session-cookies";
import { OAUTH_FLOW_COOKIE, type OAuthFlow } from "@/lib/oauth-flow-cookie";
import { DEFAULT_LANDING_PATH } from "@/lib/site-routes";
import {
  MOBILE_OAUTH_COOKIE,
  MOBILE_OAUTH_REDIRECT_COOKIE,
  mobileAuthCompletePath,
  sanitizeMobileRedirectUri,
} from "@/lib/mobile-oauth-shared";

export const OAUTH_PROVIDER_IDS = ["google", "discord", "twitter", "line", "naver"] as const;
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
};

/** Server-side OAuth kickoff — sets intent cookies then signIn(redirectTo). */
export async function startOAuthProviderSignin(opts: StartOAuthProviderSigninOptions): Promise<void> {
  const platform = opts.platform === "ios" ? "ios" : "android";
  const finalDestination = opts.mobile
    ? safeOAuthDestination(opts.callbackUrl?.trim() || mobileAuthCompletePath(platform))
    : safeOAuthDestination(opts.callbackUrl);
  const redirectTo = oauthRedirectTo(opts.flow, finalDestination, {
    addAccount: opts.addAccount,
  });
  const redirectUri = sanitizeMobileRedirectUri(opts.redirectUri ?? null);

  const jar = await cookies();
  jar.set(OAUTH_FLOW_COOKIE, opts.flow, {
    path: "/",
    maxAge: 1800,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });

  if (opts.mobile) {
    jar.set(MOBILE_OAUTH_COOKIE, "1", {
      path: "/",
      maxAge: 1800,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    if (redirectUri) {
      jar.set(MOBILE_OAUTH_REDIRECT_COOKIE, encodeURIComponent(redirectUri), {
        path: "/",
        maxAge: 1800,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  }

  if (opts.addAccount) {
    jar.set(ADD_ACCOUNT_COOKIE, "1", {
      path: "/",
      maxAge: 3600,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    await signOut({ redirect: false });
    await clearAllSessionCookies();
  }

  await signIn(opts.provider, { redirectTo });
}

export function buildProviderSigninHref(
  provider: OAuthProviderId,
  opts: {
    flow: OAuthFlow;
    callbackUrl: string;
    addAccount?: boolean;
    mobile?: boolean;
    platform?: "android" | "ios";
    redirectUri?: string | null;
  }
): string {
  const params = new URLSearchParams({
    provider,
    flow: opts.flow,
    callbackUrl: opts.callbackUrl,
  });
  if (opts.addAccount) params.set("addAccount", "1");
  if (opts.mobile) {
    params.set("platform", opts.platform === "ios" ? "ios" : "android");
    if (opts.redirectUri) params.set("redirect_uri", opts.redirectUri);
    return `/api/auth/mobile/provider-signin?${params}`;
  }
  return `/api/auth/provider-signin?${params}`;
}
