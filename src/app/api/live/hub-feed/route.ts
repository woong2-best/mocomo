import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { parseLiveCategoryParam } from "@/lib/live-categories";
import {
  getLiveHubChannelFeedPage,
  LIVE_HUB_PAGE_SIZE,
} from "@/lib/live-hub-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Paginated live hub feed for infinite scroll on /live */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "live-hub-feed", 120);
  if (limited) return limited;

  const sp = req.nextUrl.searchParams;
  const category = parseLiveCategoryParam(sp.get("category"));
  const offsetRaw = Number(sp.get("offset") ?? "0");
  const limitRaw = Number(sp.get("limit") ?? String(LIVE_HUB_PAGE_SIZE));
  const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? Math.floor(offsetRaw) : 0;
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(Math.floor(limitRaw), 50) : LIVE_HUB_PAGE_SIZE;

  try {
    const page = await getLiveHubChannelFeedPage(category, "all", offset, limit);
    return NextResponse.json(page);
  } catch {
    return NextResponse.json(
      { channels: [], hosts: [], total: 0, hasMore: false, nextOffset: offset, categoryRows: [], heroChannels: [] },
      { status: 200 }
    );
  }
}
