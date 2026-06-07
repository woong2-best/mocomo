import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { cloudflareStreamConfigError } from "@/lib/cloudflare-stream";
import { resolveWhipPublishUrlForHost } from "@/lib/cloudflare-whip-resolve";
import { readPublisherTabIdFromRequest } from "@/lib/live-publisher-lock";
import { normalizeSdp } from "@/lib/webrtc-sdp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** WHIP SDP — 브라우저 CORS 우회, Cloudflare로 프록시 (WHEP와 동일) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const cfErr = cloudflareStreamConfigError();
  if (cfErr) {
    return NextResponse.json({ error: cfErr }, { status: 503 });
  }

  const { channelId } = await params;
  if (!channelId || channelId.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const body = (await req.json().catch(() => ({}))) as { sdp?: string };
  const sdp = body.sdp ? normalizeSdp(body.sdp) : "";
  if (!sdp) {
    return NextResponse.json({ error: "SDP가 필요합니다." }, { status: 400 });
  }

  const tabId = readPublisherTabIdFromRequest(req);
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      createdBy: true,
      rtmpIngressId: true,
      rtmpUrl: true,
      broadcastMode: true,
      isLive: true,
      liveStatus: true,
      livePublisherTabId: true,
    },
  });

  if (!channel) {
    return NextResponse.json({ error: "방송을 찾을 수 없습니다." }, { status: 404 });
  }

  const resolved = await resolveWhipPublishUrlForHost(channel, session.user.id, tabId);
  if ("error" in resolved) {
    return NextResponse.json(
      {
        error: resolved.error,
        publishState: resolved.publishState,
      },
      { status: resolved.status }
    );
  }

  try {
    const cfRes = await fetch(resolved.whipUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
        Accept: "application/sdp",
      },
      body: sdp,
    });
    const text = await cfRes.text();
    if (!cfRes.ok) {
      return NextResponse.json(
        { error: text || `WHIP ${cfRes.status}` },
        { status: cfRes.status >= 400 && cfRes.status < 600 ? cfRes.status : 502 }
      );
    }

    return NextResponse.json({
      answerSdp: normalizeSdp(text),
      location: cfRes.headers.get("location"),
      etag: cfRes.headers.get("etag"),
    });
  } catch (e) {
    console.error("[whip-proxy]", channelId, e);
    return NextResponse.json(
      { error: "Cloudflare 송출 서버 연결에 실패했습니다." },
      { status: 502 }
    );
  }
}
