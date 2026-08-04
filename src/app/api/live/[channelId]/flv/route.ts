import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { srsConfigError } from "@/lib/srs";
import { db } from "@/lib/db";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { resolveObsStreamKeyForChannel } from "@/lib/user-obs-stream-key";
import { rejectIfFirstPartyLiveDisabled } from "@/lib/live-first-party-guard";
import { isSrsStreamOnAir, resolveSrsFlvUpstreamUrl } from "@/lib/srs-hls-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** 라이브 FLV — Vercel Pro에서 최대 300초 (끊기면 flv.js가 재연결) */
export const maxDuration = 300;

/** HLS 실패 시 SRS HTTP-FLV 프록시 (타임아웃 없음 — 라이브 스트림) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const blocked = rejectIfFirstPartyLiveDisabled();
  if (blocked) return blocked;

  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { channelId } = await params;
  if (srsConfigError()) {
    return new NextResponse("SRS not configured", { status: 503 });
  }

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel) return new NextResponse("Not Found", { status: 404 });

  const isHost = channel.createdBy === session.user.id;
  if (!isHost) {
    const access = await resolveLiveChannelAccess(channelId, session.user.id);
    if (!access.allowed) return new NextResponse("Forbidden", { status: 403 });
  }

  const { streamKey } = await resolveObsStreamKeyForChannel(channelId, {
    viewerUserId: session.user.id,
  });

  if (!streamKey) return new NextResponse("No stream key", { status: 404 });

  const onAir = await isSrsStreamOnAir(streamKey);
  if (!onAir) {
    return new NextResponse("Stream not publishing", { status: 404 });
  }

  const upstreamUrl =
    (await resolveSrsFlvUpstreamUrl(streamKey)) ??
    null;

  if (!upstreamUrl) {
    return new NextResponse("FLV not found on VPS", { status: 404 });
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: req.headers.get("range") ? { Range: req.headers.get("range")! } : undefined,
    });

    if (!upstream.ok || !upstream.body) {
      return new NextResponse(`FLV upstream ${upstream.status}`, { status: upstream.status });
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        "Content-Type": "video/x-flv",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": req.headers.get("origin") ?? "*",
        "Access-Control-Allow-Credentials": "true",
        ...(upstream.headers.get("content-length")
          ? { "Content-Length": upstream.headers.get("content-length")! }
          : {}),
      },
    });
  } catch (e) {
    console.error("[flv-proxy]", upstreamUrl, e);
    return new NextResponse("FLV proxy error", { status: 502 });
  }
}

/** flv.js 사전 연결 확인 (본문 스트림 없음) */
export async function HEAD(
  _req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
  const blocked = rejectIfFirstPartyLiveDisabled();
  if (blocked) return blocked;

  const session = await auth();
  if (!session?.user?.id) return new NextResponse(null, { status: 401 });

  const { channelId } = await params;
  if (srsConfigError()) return new NextResponse(null, { status: 503 });

  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel) return new NextResponse(null, { status: 404 });

  if (channel.createdBy !== session.user.id) {
    const access = await resolveLiveChannelAccess(channelId, session.user.id);
    if (!access.allowed) return new NextResponse(null, { status: 403 });
  }

  const { streamKey } = await resolveObsStreamKeyForChannel(channelId, {
    viewerUserId: session.user.id,
  });
  if (!streamKey) return new NextResponse(null, { status: 404 });

  const onAir = await isSrsStreamOnAir(streamKey);
  if (!onAir) return new NextResponse(null, { status: 404 });

  const upstreamUrl = await resolveSrsFlvUpstreamUrl(streamKey);
  if (!upstreamUrl) return new NextResponse(null, { status: 404 });

  return new NextResponse(null, {
    status: 200,
    headers: { "Content-Type": "video/x-flv", "Cache-Control": "no-store" },
  });
}
