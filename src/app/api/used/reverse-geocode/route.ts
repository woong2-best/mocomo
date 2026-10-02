import { NextRequest, NextResponse } from "next/server";
import { reverseGeocodeMeet } from "@/lib/maps/geocode";
import { normalizeMeetCountry } from "@/lib/maps/select-engine";

export async function GET(req: NextRequest) {
  const country = normalizeMeetCountry(req.nextUrl.searchParams.get("country"));
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lng = parseFloat(req.nextUrl.searchParams.get("lng") ?? "");
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await reverseGeocodeMeet({ country, lat, lng });
    if (!result) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    return NextResponse.json({ ...result, country });
  } catch {
    return NextResponse.json({ error: "Request failed." }, { status: 500 });
  }
}
