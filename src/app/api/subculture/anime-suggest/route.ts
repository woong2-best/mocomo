import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { suggestAnimeForCommerce } from "@/lib/subculture-commerce/anime-suggest";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "subculture-anime-suggest", 60);
  if (limited) return limited;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ items: [] });
  }

  const items = await suggestAnimeForCommerce(q, 8);
  return NextResponse.json(
    { items },
    { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } }
  );
}
