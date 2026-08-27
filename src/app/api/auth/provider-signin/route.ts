import { NextRequest, NextResponse } from "next/server";
import { isOAuthProviderId } from "@/lib/oauth-provider-signin-shared";
import { startOAuthProviderSignin } from "@/lib/oauth-provider-signin";

/** Web OAuth — server redirect so Auth.js callback-url is set correctly. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const provider = sp.get("provider") ?? "";
  if (!isOAuthProviderId(provider)) {
    return NextResponse.redirect(new URL("/auth/error?error=Configuration", req.url));
  }

  const flow = sp.get("flow") === "signup" ? "signup" : "signin";
  const addAccount = sp.get("addAccount") === "1";

  try {
    await startOAuthProviderSignin({
      provider,
      flow,
      callbackUrl: sp.get("callbackUrl"),
      addAccount,
      mobile: false,
    });
  } catch (e) {
    console.error("[api/auth/provider-signin]", e);
    return NextResponse.redirect(new URL("/auth/error?error=Configuration", req.url));
  }

  return NextResponse.redirect(new URL("/auth/signin?error=Configuration", req.url));
}
