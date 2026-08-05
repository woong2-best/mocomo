import { NextRequest, NextResponse } from "next/server";
import { OAUTH_FLOW_COOKIE, type OAuthFlow } from "@/lib/oauth-flow-cookie";

/** Sets httpOnly OAuth intent before redirecting to the provider (survives Google callback). */
export async function GET(req: NextRequest) {
  const flow = req.nextUrl.searchParams.get("flow");
  if (flow !== "signin" && flow !== "signup") {
    return NextResponse.json({ error: "invalid_flow" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(OAUTH_FLOW_COOKIE, flow satisfies OAuthFlow, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 30,
  });
  return res;
}
