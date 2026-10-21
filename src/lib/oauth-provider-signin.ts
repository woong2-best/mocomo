import { cookies } from "next/headers";
import { signIn, auth } from "@/lib/auth";
import {
  ADD_ACCOUNT_COOKIE,
  ADD_ACCOUNT_SOURCE_USER_COOKIE,
  DEVICE_ACCOUNT_COOKIE,
} from "@/lib/account-switch/constants";
import { clearSessionTokenCookies } from "@/lib/account-switch/session-cookies";
import { OAUTH_FLOW_COOKIE } from "@/lib/oauth-flow-cookie";
import {
  MOBILE_OAUTH_COOKIE,
  MOBILE_OAUTH_PLATFORM_COOKIE,
  MOBILE_OAUTH_PROVIDER_COOKIE,
  MOBILE_OAUTH_REDIRECT_COOKIE,
} from "@/lib/mobile-oauth-shared";
import {
  type StartOAuthProviderSigninOptions,
  resolveOAuthProviderSignin,
} from "@/lib/oauth-provider-signin-shared";

/** Server-side OAuth kickoff — sets intent cookies then signIn(redirectTo). */
export async function startOAuthProviderSignin(opts: StartOAuthProviderSigninOptions): Promise<void> {
  const { redirectTo, redirectUri } = resolveOAuthProviderSignin(opts);
  const secure = process.env.NODE_ENV === "production";

  const jar = await cookies();
  jar.set(OAUTH_FLOW_COOKIE, opts.flow, {
    path: "/",
    maxAge: 1800,
    sameSite: "lax",
    secure,
    httpOnly: true,
  });
  // Readable from the apply page so mobile can auto-continue signup after not_registered.
  jar.set(MOBILE_OAUTH_PROVIDER_COOKIE, opts.provider, {
    path: "/",
    maxAge: 1800,
    sameSite: "lax",
    secure,
    httpOnly: false,
  });

  if (opts.mobile) {
    const platform = opts.platform === "ios" ? "ios" : "android";
    jar.set(MOBILE_OAUTH_COOKIE, "1", {
      path: "/",
      maxAge: 1800,
      sameSite: "lax",
      secure,
    });
    jar.set(MOBILE_OAUTH_PLATFORM_COOKIE, platform, {
      path: "/",
      maxAge: 1800,
      sameSite: "lax",
      secure,
    });
    if (redirectUri) {
      jar.set(MOBILE_OAUTH_REDIRECT_COOKIE, encodeURIComponent(redirectUri), {
        path: "/",
        maxAge: 1800,
        sameSite: "lax",
        secure,
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

    const session = await auth();
    if (session?.user?.id) {
      if (!jar.get(ADD_ACCOUNT_SOURCE_USER_COOKIE)?.value) {
        jar.set(ADD_ACCOUNT_SOURCE_USER_COOKIE, session.user.id, {
          path: "/",
          maxAge: 3600,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
        });
      }
      try {
        const { parkUserOnDevice, resolveDeviceId } = await import(
          "@/lib/account-switch/device-sessions"
        );
        const deviceId = await resolveDeviceId();
        await parkUserOnDevice(deviceId, session.user.id);
        jar.set(DEVICE_ACCOUNT_COOKIE, deviceId, {
          httpOnly: true,
          sameSite: "lax",
          path: "/",
          secure: process.env.NODE_ENV === "production",
          maxAge: 60 * 60 * 24 * 400,
        });
      } catch {
        // Park is best-effort — add-account still proceeds.
      }
    }
  }

  // Mobile AuthSession must never reuse a stale browser session — otherwise the user
  // picks a Google account but gets tokens for whoever was last in the WebView.
  // Web add-account keeps the current cookie so cancel/back stays signed in.
  if (opts.mobile) {
    await clearSessionTokenCookies();
  }

  // Auth.js signIn(provider, options, authorizationParams) — the third argument
  // is appended to the provider authorize URL. Putting `authorizationParams`
  // inside options never reaches Google, so the browser session is reused and
  // the account chooser is skipped.
  const selectAccount = opts.provider === "google" && opts.selectAccount !== false;
  await signIn(
    opts.provider,
    { redirectTo },
    selectAccount ? { prompt: "select_account" } : undefined
  );
}
