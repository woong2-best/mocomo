import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { getSubcultureMapPins, getSubcultureMapPinsForUser } from "@/lib/subculture-events";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-events-map", 60);
  if (limited) return limited;

  await getMobileUserId(req);

  try {
    const global = req.nextUrl.searchParams.get("global") === "1";
    const country = req.nextUrl.searchParams.get("country") ?? undefined;
    const pins = global
      ? await getSubcultureMapPins(280)
      : await getSubcultureMapPinsForUser(200, country ?? undefined);

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
