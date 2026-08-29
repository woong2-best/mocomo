import { NextRequest, NextResponse } from "next/server";
import { isOAuthProviderId } from "@/lib/oauth-provider-signin-shared";
import { startOAuthProviderSignin } from "@/lib/oauth-provider-signin";
import { isNextNavigationError } from "@/lib/next-navigation-error";

/**
 * Mobile AuthSession: start OAuth with a server redirect (no client CSRF fetch).
 * Custom Tabs often break next-auth/react signIn() → Configuration error.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const provider = sp.get("provider") ?? "";
  if (!isOAuthProviderId(provider)) {
    return NextResponse.redirect(new URL("/auth/error?error=Configuration", req.url));
  }

  const platform = sp.get("platform") === "ios" ? "ios" : "android";
  const flow = sp.get("flow") === "signup" ? "signup" : "signin";
  const addAccount = sp.get("addAccount") === "1";

  try {
    await startOAuthProviderSignin({
      provider,
      flow,
      callbackUrl: sp.get("callbackUrl"),
      addAccount,
      mobile: true,
      platform,
      redirectUri: sp.get("redirect_uri"),
    });
  } catch (e) {
    if (isNextNavigationError(e)) throw e;
    console.error("[api/auth/mobile/provider-signin]", e);
    return NextResponse.redirect(new URL("/auth/error?error=Configuration", req.url));
  }

  return NextResponse.redirect(new URL("/auth/signin?error=Configuration", req.url));
}
