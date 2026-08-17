import { NextRequest, NextResponse } from "next/server";
import {
  isOAuthProviderId,
  startOAuthProviderSignin,
} from "@/lib/oauth-provider-signin";

/** Web OAuth — server redirect so Auth.js callback-url is set correctly. */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const provider = sp.get("provider") ?? "";
  if (!isOAuthProviderId(provider)) {
    return NextResponse.redirect(new URL("/auth/error?error=Configuration", req.url));
  }

  const flow = sp.get("flow") === "signup" ? "signup" : "signin";
  const addAccount = sp.get("addAccount") === "1";

  await startOAuthProviderSignin({
    provider,
    flow,
    callbackUrl: sp.get("callbackUrl"),
    addAccount,
    mobile: false,
  });
}
