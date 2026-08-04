import { NextRequest, NextResponse } from "next/server";
import { probeChzzkEmbed } from "@/lib/live-external/chzzk-probe";
import { rateLimitPublicApi } from "@/lib/api-security";
import { parseExternalLiveSource } from "@/lib/live-external/parse";

/** 치지직 embed URL 동작 여부 프로브 */
export async function GET(req: NextRequest) {
  const limited = await rateLimitPublicApi(req, "chzzk-embed-probe", 20);
  if (limited) return limited;

  const raw =
    req.nextUrl.searchParams.get("channelId") ||
    req.nextUrl.searchParams.get("url") ||
    "";
  if (!raw.trim()) {
    return NextResponse.json({ error: "channelId 또는 url 필요" }, { status: 400 });
  }

  const parsed = parseExternalLiveSource(raw, { providerHint: "CHZZK" });
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const probe = await probeChzzkEmbed(parsed.externalId);
  return NextResponse.json({
    provider: "CHZZK",
    channelId: parsed.externalId,
    watchUrl: parsed.watchUrl,
    ...probe,
    decision: probe.recommendEmbed
      ? "embed"
      : "open_external_fallback",
  });
}
