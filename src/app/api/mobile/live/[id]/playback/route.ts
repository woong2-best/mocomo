import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { requireMobileApiUser } from "@/lib/api-mobile-auth";
import { buildViewerPlaybackPayload, resolveMobileHlsUrl } from "@/lib/live-viewer-playback";
import { rejectIfFirstPartyLiveDisabled } from "@/lib/live-first-party-guard";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const blocked = rejectIfFirstPartyLiveDisabled();
  if (blocked) return blocked;

  const limited = await rateLimitPublicApi(req, "mobile-live-playback", 60);
  if (limited) return limited;

  const authResult = await requireMobileApiUser(req);
  if ("error" in authResult) return authResult.error;

  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const payload = await buildViewerPlaybackPayload(id, authResult.user.id);
  const { status, ...body } = payload;

  if (status !== 200) {
    return NextResponse.json(body, { status });
  }

  const origin = req.nextUrl.origin;
  const hlsUrl = resolveMobileHlsUrl(body, origin);

  return NextResponse.json({ ...body, hlsUrl });
}
