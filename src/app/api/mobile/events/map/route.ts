import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getEventMapUserRecommendations } from "@/lib/event-map-recommendations";
import { getSubcultureMapPins, getSubcultureMapPinsForUser } from "@/lib/subculture-events";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-events-map", 60);
  if (limited) return limited;


  try {
    const global = req.nextUrl.searchParams.get("global") === "1";
    const country = req.nextUrl.searchParams.get("country") ?? undefined;
    const basePins = global
      ? await getSubcultureMapPins(520)
      : await getSubcultureMapPinsForUser(200, country ?? undefined);
    let userRecs: Awaited<ReturnType<typeof getEventMapUserRecommendations>> = [];
    try {
      userRecs = await getEventMapUserRecommendations(300);
    } catch {
      /* ignore */
    }
    const pins = [...basePins, ...userRecs];

    return NextResponse.json(
      { pins },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
        },
      }
    );
  } catch (e) {
    console.error("[api/mobile/events/map]", e);
    return NextResponse.json({ pins: [] });
  }
}
