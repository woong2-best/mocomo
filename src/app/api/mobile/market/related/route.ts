import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import {
  listMarketplaceListingsByTags,
} from "@/lib/marketplace/mobile-market-hub";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-market-related", 80);
  if (limited) return limited;

  const tagsRaw = req.nextUrl.searchParams.get("tags")?.trim() ?? "";
  const excludeRaw = req.nextUrl.searchParams.get("exclude")?.trim() ?? "";
  const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
  const excludeIds = excludeRaw.split(",").map((t) => t.trim()).filter(Boolean);

  const items = await listMarketplaceListingsByTags(tags, { excludeIds, take: 24 });
  return NextResponse.json({ items });
}
