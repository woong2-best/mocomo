import { NextResponse } from "next/server";
import { getCachedRailAds } from "@/lib/cached-data";
import {
  FALLBACK_RAIL_LEFT_ADS,
  FALLBACK_RAIL_RIGHT_ADS,
} from "@/lib/default-ads";

export async function GET() {
  try {
    const { left, right } = await getCachedRailAds();
    return NextResponse.json(
      {
        ok: true,
        left: left.length > 0 ? left : [...FALLBACK_RAIL_LEFT_ADS],
        right: right.length > 0 ? right : [...FALLBACK_RAIL_RIGHT_ADS],
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (e) {
    console.error("[api/ads/rails]", e);
    return NextResponse.json({
      ok: true,
      left: [...FALLBACK_RAIL_LEFT_ADS],
      right: [...FALLBACK_RAIL_RIGHT_ADS],
    });
  }
}
