import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-post-auth";
import { rateLimitPublicApi } from "@/lib/api-security";
import { isGiphyConfigured, resolveGiphyPlatform, searchGiphyGifs } from "@/lib/giphy";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "giphy-search", 40);
  if (limited) return limited;

  const authResult = await requireApiUser({ writeKind: "comment" });
  if ("error" in authResult) return authResult.error;

  const platform = resolveGiphyPlatform({
    header: req.headers.get("x-mocomo-platform"),
    userAgent: req.headers.get("user-agent"),
  });
  if (!isGiphyConfigured(platform)) {
    return NextResponse.json({ error: "GIF search is not configured.", items: [] }, { status: 503 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    const items = await searchGiphyGifs(q, platform);
    return NextResponse.json({ items });
  } catch {
    return NextResponse.json({ error: "Couldn't load GIFs.", items: [] }, { status: 502 });
  }
}
