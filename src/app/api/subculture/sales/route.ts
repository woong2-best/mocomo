import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getRecentSubcultureSales } from "@/lib/subculture-commerce/sale-records";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "subculture-sales", 60);
  if (limited) return limited;

  const workTitle = req.nextUrl.searchParams.get("work")?.trim() || undefined;
  const animeSlug = req.nextUrl.searchParams.get("anime")?.trim() || undefined;
  const productType = req.nextUrl.searchParams.get("product")?.trim() || undefined;
  const characterName = req.nextUrl.searchParams.get("character")?.trim() || undefined;

  const stats = await getRecentSubcultureSales({
    workTitle,
    animeSlug,
    productType,
    characterName,
    take: 10,
  });

  return NextResponse.json(stats, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
