import { NextRequest, NextResponse } from "next/server";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { isTenorConfigured, searchTenorGifs } from "@/lib/tenor";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "mobile-tenor-search", 40);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req, { writeKind: "comment" });
  if ("error" in authResult) return authResult.error;

  if (!isTenorConfigured()) {
    return NextResponse.json({ error: "GIF search is not configured.", items: [] }, { status: 503 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    const items = await searchTenorGifs(q);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Couldn't load GIFs.", items: [] }, { status: 502 });
  }
}
