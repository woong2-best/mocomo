import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { getAuctionBidRoom } from "@/lib/auction-bid-room";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const limited = await rateLimitPublicApi(req, "mobile-marketplace-bids", 60);
  if (limited) return limited;

  const { id } = await ctx.params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const viewerId = await getMobileUserId(req);
  const room = await getAuctionBidRoom(id, viewerId);
  if (!room) {
    return NextResponse.json({ error: "Auction not found." }, { status: 404 });
  }
  return NextResponse.json(room);
}
