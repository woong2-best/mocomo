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
    return NextResponse.redirect(
      new URL(`/auth/error?error=Configuration&provider=${encodeURIComponent(provider)}`, req.url)
    );
  }

  const platform = sp.get("platform") === "ios" ? "ios" : "android";
  const flow = sp.get("flow") === "signup" ? "signup" : "signin";
  const addAccount = sp.get("addAccount") === "1";
  const selectAccount = sp.get("selectAccount") !== "0";

  try {
    await startOAuthProviderSignin({
      provider,
      flow,
      callbackUrl: sp.get("callbackUrl"),
      addAccount,
      mobile: true,
      platform,
      redirectUri: sp.get("redirect_uri"),
      selectAccount,
    });
  } catch (e) {
    if (isNextNavigationError(e)) throw e;
    console.error("[api/auth/mobile/provider-signin]", provider, e);
    return NextResponse.redirect(
      new URL(`/auth/error?error=Configuration&provider=${encodeURIComponent(provider)}`, req.url)
    );
  }

  console.error("[api/auth/mobile/provider-signin] signIn returned without redirect", provider);
  return NextResponse.redirect(
    new URL(`/auth/error?error=Configuration&provider=${encodeURIComponent(provider)}`, req.url)
  );
}
