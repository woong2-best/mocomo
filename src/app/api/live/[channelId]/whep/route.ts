import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { cloudflareStreamConfigError } from "@/lib/cloudflare-stream";
import {
  fetchChannelForWhep,
  resolveWhepPlaybackUrlForViewer,
} from "@/lib/cloudflare-whep-resolve";
import { rejectIfFirstPartyLiveDisabled } from "@/lib/live-first-party-guard";
import { normalizeSdp } from "@/lib/webrtc-sdp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** WHEP SDP — 브라우저 CORS 우회, Cloudflare로 프록시 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const blocked = rejectIfFirstPartyLiveDisabled();
  if (blocked) return blocked;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const cfErr = cloudflareStreamConfigError();
  if (cfErr) {
    return NextResponse.json({ error: cfErr }, { status: 503 });
  }

  const { channelId } = await params;
  const body = (await req.json().catch(() => ({}))) as { sdp?: string };
  const sdp = body.sdp ? normalizeSdp(body.sdp) : "";
  if (!sdp) {
    return NextResponse.json({ error: "SDP가 필요합니다." }, { status: 400 });
  }

  const channel = await fetchChannelForWhep(channelId);
  if (!channel) {
    return NextResponse.json({ error: "방송을 찾을 수 없습니다." }, { status: 404 });
  }

  const resolved = await resolveWhepPlaybackUrlForViewer(channelId, channel, session.user.id);
  if ("error" in resolved) {
    return NextResponse.json(
      { error: resolved.error, notReady: resolved.notReady ?? resolved.status === 409 },
      { status: resolved.status }
    );
  }

  try {
    const cfRes = await fetch(resolved.whepUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        Accept: "application/sdp",
      },
      body: sdp,
    });
    const text = await cfRes.text();
    if (!cfRes.ok) {
      const notReady =
        cfRes.status === 409 || /not started yet/i.test(text);
      return NextResponse.json(
        { error: text || `WHEP ${cfRes.status}`, notReady },
        { status: notReady ? 409 : cfRes.status }
      );
    }

    return NextResponse.json({
      answerSdp: normalizeSdp(text),
      location: cfRes.headers.get("location"),
      etag: cfRes.headers.get("etag"),
    });
  } catch (e) {
    console.error("[whep-proxy]", channelId, e);
    return NextResponse.json(
      { error: "실시간 재생 연결에 실패했습니다." },
      { status: 502 }
    );
  }
}
