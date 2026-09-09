import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getCachedSidebarPanelData } from "@/lib/cached-data";
import { resolveSubculturePinsForUser } from "@/lib/subculture-event-countries";
import { getRequestCountryCode } from "@/lib/i18n/server";

/** 우측 패널 데이터 — CDN/브라우저 캐시로 반복 요청 완화 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const countryParam = searchParams.get("country");
    const pathname = searchParams.get("pathname") ?? (await headers()).get("x-pathname") ?? "/";
    const countryCode = countryParam?.toUpperCase() || (await getRequestCountryCode());
    const { trendingQueries, searchRankingScope, tips, sidebarAds, eventPins } =
      await getCachedSidebarPanelData(pathname);
    const filteredPins = resolveSubculturePinsForUser(eventPins, countryCode).slice(0, 12);
    return NextResponse.json(
      {
        ok: true,
        trendingQueries,
        searchRankingScope,
        animes: [],
        tips,
        sidebarAds,
        eventPins: filteredPins,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (e) {
    console.error("[api/sidebar]", e);
    return NextResponse.json(
      {
        ok: true,
        trendingQueries: [],
        animes: [],
        tips: [],
        sidebarAds: [],
        eventPins: [],
      },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=30" } }
    );
  }
}
