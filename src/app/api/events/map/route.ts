import { NextResponse } from "next/server";
import { getSubcultureMapPins, getSubcultureMapPinsForUser } from "@/lib/subculture-events";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const global = searchParams.get("global") === "1";
    const country = searchParams.get("country") ?? undefined;
    const pins = global
      ? await getSubcultureMapPins(280)
      : await getSubcultureMapPinsForUser(200, country ?? undefined);
    return NextResponse.json(
      { ok: true, pins },
      {
        headers: {
          "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1800",
        },
      }
    );
  } catch (e) {
    console.error("[api/events/map]", e);
    return NextResponse.json({ ok: true, pins: [] });
  }
}
