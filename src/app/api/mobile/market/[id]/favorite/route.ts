import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { toggleMarketplaceFavoriteForUser } from "@/lib/marketplace/mobile-market-hub";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, ctx: Ctx) {
  const limited = await rateLimitPublicApi(req, "mobile-market-favorite-toggle", 40);
  if (limited) return limited;

  const auth = await requireMobileApiUser(req, { writeKind: "default" });
  if ("error" in auth) return auth.error;

  const { id } = await ctx.params;
  const result = await toggleMarketplaceFavoriteForUser(auth.user.id, id);
  return NextResponse.json(result);
}
