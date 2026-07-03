import { NextResponse } from "next/server";
import { getCachedRailAds } from "@/lib/cached-data";

export async function GET() {
  try {
    const { left, right } = await getCachedRailAds();
    return NextResponse.json(
      { ok: true, left, right },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (e) {
    console.error("[api/ads/rails]", e);
    return NextResponse.json({ ok: true, left: [], right: [] });
  }
}
