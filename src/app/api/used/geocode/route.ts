import { NextRequest, NextResponse } from "next/server";
import { geocodeMeetQuery } from "@/lib/maps/geocode";
import { normalizeMeetCountry } from "@/lib/maps/select-engine";

export async function GET(req: NextRequest) {
  const country = normalizeMeetCountry(req.nextUrl.searchParams.get("country"));
  const region = req.nextUrl.searchParams.get("region")?.trim() ?? "";
  const place = req.nextUrl.searchParams.get("place")?.trim() ?? "";
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  const query = q || [place, region].filter(Boolean).join(" ");
  if (!query) {
    return NextResponse.json({ error: "Required field missing." }, { status: 400 });
  }

  try {
    const result = await geocodeMeetQuery({ country, region, place, q });
    if (!result) {
      return NextResponse.json({ error: "Place not found." }, { status: 404 });
    }
    return NextResponse.json({ ...result, country });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
