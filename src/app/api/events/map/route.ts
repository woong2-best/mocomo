import { NextResponse } from "next/server";
import { getSubcultureMapPins } from "@/lib/subculture-events";

export async function GET() {
  try {
    const pins = await getSubcultureMapPins(40);
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
