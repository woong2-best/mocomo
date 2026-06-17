import { NextResponse } from "next/server";
import { getCachedSidebarPanelData } from "@/lib/cached-data";

/** 우측 패널 데이터 — CDN/브라우저 캐시로 반복 요청 완화 */
export async function GET() {
  try {
    const { animes, tips, sidebarAds, eventPins } = await getCachedSidebarPanelData();
    return NextResponse.json(
      { ok: true, animes, tips, sidebarAds, eventPins },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      }
    );
  } catch (e) {
    console.error("[api/sidebar]", e);
    return NextResponse.json(
      { ok: true, animes: [], tips: [], sidebarAds: [], eventPins: [] },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=30" } }
    );
  }
}
