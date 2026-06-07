import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildCloudflarePlaybackFields } from "@/lib/cloudflare-browser-playback";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { cloudflareStreamConfigError } from "@/lib/cloudflare-stream";
import { resolveChannelIngestEngine } from "@/lib/live-ingest";
import { normalizeSdp } from "@/lib/webrtc-sdp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function resolveWhepUrl(channelId: string, userId: string) {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      createdBy: true,
      rtmpIngressId: true,
      rtmpUrl: true,
      broadcastMode: true,
      isLive: true,
      liveStatus: true,
    },
  });
  if (!channel) return { error: "방송을 찾을 수 없습니다.", status: 404 as const };

  if (channel.createdBy === userId) {
    const cf = await buildCloudflarePlaybackFields(channel);
    if (cf.whepPlaybackUrl) return { whepUrl: cf.whepPlaybackUrl };
    return { error: cf.message ?? "방송 재생 URL을 준비 중입니다.", status: 409 as const };
  }

  const access = await resolveLiveChannelAccess(channelId, userId);
  if (!access.allowed) {
    return { error: "시청 권한이 없습니다.", status: 403 as const };
  }

  if (resolveChannelIngestEngine(channel) !== "cloudflare") {
    return { error: "Cloudflare 방송이 아닙니다.", status: 400 as const };
  }

  const cf = await buildCloudflarePlaybackFields(channel);
  if (!cf.whepPlaybackUrl) {
    return { error: cf.message ?? "재생 URL 준비 중", status: 409 as const };
  }
  return { whepUrl: cf.whepPlaybackUrl };
}

/** WHEP SDP — 브라우저 CORS 우회, Cloudflare로 프록시 */
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
  const body = (await req.json().catch(() => ({}))) as { sdp?: string };
  const sdp = body.sdp ? normalizeSdp(body.sdp) : "";
  if (!sdp) {
    return NextResponse.json({ error: "SDP가 필요합니다." }, { status: 400 });
  }

  const resolved = await resolveWhepUrl(channelId, session.user.id);
  if ("error" in resolved) {
    return NextResponse.json(
      { error: resolved.error, notReady: resolved.status === 409 },
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
