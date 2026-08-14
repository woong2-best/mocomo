import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { getMarketplaceSellItemGate } from "@/actions/marketplace";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-market-sell-access", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "notification" });
  if ("error" in auth) return auth.error;

  const gate = await getMarketplaceSellItemGate(auth.user.id);
  if (gate.allowed) {
    return NextResponse.json({ allowed: true });
  }
  const redirectTo = gate.redirectTo.includes("register") ? "register" : "seller";
  return NextResponse.json({ allowed: false, redirectTo });
}
