import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getEmoticonPacks } from "@/actions/goods-shop";

/** Emoticon packs (web `/market/emoticons`) — separate from MarketplaceListing. */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-star-emoticons", 60);
  if (limited) return limited;

  const { packs } = await getEmoticonPacks();

  return NextResponse.json({
    items: packs.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.name,
      type: "EMOTICON" as const,
      priceAmount: p.price,
      currency: "KRW",
      coverUrl: p.previewUrl,
      seller: null,
    })),
  });
}
