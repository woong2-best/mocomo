import { cookies } from "next/headers";
import { signIn, signOut } from "@/lib/auth";
import { ADD_ACCOUNT_COOKIE } from "@/lib/account-switch/constants";
import { clearAllSessionCookies } from "@/lib/account-switch/session-cookies";
import { OAUTH_FLOW_COOKIE } from "@/lib/oauth-flow-cookie";
import {
  MOBILE_OAUTH_COOKIE,
  MOBILE_OAUTH_REDIRECT_COOKIE,
} from "@/lib/mobile-oauth-shared";
import {
  type StartOAuthProviderSigninOptions,
  resolveOAuthProviderSignin,
} from "@/lib/oauth-provider-signin-shared";

/** Server-side OAuth kickoff — sets intent cookies then signIn(redirectTo). */
export async function startOAuthProviderSignin(opts: StartOAuthProviderSigninOptions): Promise<void> {
  const { redirectTo, redirectUri } = resolveOAuthProviderSignin(opts);

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
