import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { signIn, signOut } from "@/lib/auth";
import { ADD_ACCOUNT_COOKIE } from "@/lib/account-switch/constants";
import { clearAllSessionCookies } from "@/lib/account-switch/session-cookies";
import { OAUTH_FLOW_COOKIE } from "@/lib/oauth-flow-cookie";
import {
  MOBILE_OAUTH_COOKIE,
  MOBILE_OAUTH_REDIRECT_COOKIE,
  mobileAuthCompletePath,
  sanitizeMobileRedirectUri,
} from "@/lib/mobile-oauth-shared";

const ALLOWED = new Set(["google", "discord", "twitter", "line", "naver"]);

function safeCallbackUrl(raw: string | null, platform: "android" | "ios"): string {
  const path = raw?.trim() ?? "";
  if (path.startsWith("/") && !path.startsWith("//")) return path;
  return mobileAuthCompletePath(platform);
}

/**
 * Mobile AuthSession: start OAuth with a server redirect (no client CSRF fetch).
 * Custom Tabs often break next-auth/react signIn() → Configuration error.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const provider = sp.get("provider") ?? "";
  if (!ALLOWED.has(provider)) {
    return NextResponse.redirect(new URL("/auth/error?error=Configuration", req.url));
  }

  const platform = sp.get("platform") === "ios" ? "ios" : "android";
  const flow = sp.get("flow") === "signup" ? "signup" : "signin";
  const addAccount = sp.get("addAccount") === "1";
  const finalDestination = safeCallbackUrl(sp.get("callbackUrl"), platform);
  const redirectTo =
    flow === "signup"
      ? finalDestination
      : `/auth/oauth/complete?dest=${encodeURIComponent(finalDestination)}`;
  const redirectUri = sanitizeMobileRedirectUri(sp.get("redirect_uri"));

  const jar = await cookies();
  jar.set(MOBILE_OAUTH_COOKIE, "1", {
    path: "/",
    maxAge: 1800,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  jar.set(OAUTH_FLOW_COOKIE, flow, {
    path: "/",
    maxAge: 1800,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
  if (redirectUri) {
    jar.set(MOBILE_OAUTH_REDIRECT_COOKIE, encodeURIComponent(redirectUri), {
      path: "/",
      maxAge: 1800,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  if (addAccount) {
    jar.set(ADD_ACCOUNT_COOKIE, "1", {
      path: "/",
      maxAge: 3600,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    await signOut({ redirect: false });
    await clearAllSessionCookies();
  }

  await signIn(provider, { redirectTo });
}
