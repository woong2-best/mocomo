import { cookies } from "next/headers";
import { signIn, auth } from "@/lib/auth";
import { ADD_ACCOUNT_COOKIE, ADD_ACCOUNT_SOURCE_USER_COOKIE } from "@/lib/account-switch/constants";
import { clearSessionTokenCookies } from "@/lib/account-switch/session-cookies";
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

    // Source user id is set client-side before logout; only backfill if still logged in.
    const session = await auth();
    if (session?.user?.id && !jar.get(ADD_ACCOUNT_SOURCE_USER_COOKIE)?.value) {
      jar.set(ADD_ACCOUNT_SOURCE_USER_COOKIE, session.user.id, {
        path: "/",
        maxAge: 3600,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }
  }

  // Mobile AuthSession must never reuse a stale browser session — otherwise the user
  // picks ojeojag@gmail.com in Google but gets tokens for tom6761bear@gmail.com.
  // Drop session JWT only (not full signOut) so CSRF for signIn() below stays valid.
  if (opts.mobile || opts.addAccount) {
    await clearSessionTokenCookies();
  }

  await signIn(opts.provider, {
    redirectTo,
    ...(opts.mobile && opts.provider === "google"
      ? { authorizationParams: { prompt: "select_account" } }
      : {}),
  });
}
