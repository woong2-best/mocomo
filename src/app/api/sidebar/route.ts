import { NextResponse } from "next/server";
import {
  getCachedPopularAnime,
  getCachedSidebarAds,
  getCachedSidebarTips,
} from "@/lib/cached-data";

/** 우측 패널 데이터 — CDN/브라우저 캐시로 반복 요청 완화 */
export async function GET() {
  try {
    const [animes, tips, sidebarAds] = await Promise.all([
      getCachedPopularAnime(),
      getCachedSidebarTips(),
      getCachedSidebarAds(),
    ]);
    return NextResponse.json(
      { ok: true, animes, tips, sidebarAds },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    console.error("[api/sidebar]", e);
    return NextResponse.json(
      { ok: true, animes: [], tips: [], sidebarAds: [] },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=30" } }
    );
  }
}
