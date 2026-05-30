import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { buildFlvPlaybackUrl, srsConfigError } from "@/lib/srs";
import { db } from "@/lib/db";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import {
  getOrCreateUserObsStreamKey,
  resolveObsStreamKeyForChannel,
} from "@/lib/user-obs-stream-key";
import { isSrsStreamOnAir } from "@/lib/srs-hls-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** HLS 실패 시 SRS HTTP-FLV 프록시 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string }> }
) {
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
    select: { createdBy: true, rtmpStreamKey: true },
  });
  if (!channel) return new NextResponse("Not Found", { status: 404 });

  const isHost = channel.createdBy === session.user.id;
  if (!isHost) {
    const access = await resolveLiveChannelAccess(channelId, session.user.id);
    if (!access.allowed) return new NextResponse("Forbidden", { status: 403 });
  }

  let streamKey =
    channel.rtmpStreamKey?.trim() ||
    req.nextUrl.searchParams.get("key")?.trim() ||
    null;

  if (!streamKey && isHost) {
    try {
      streamKey = await getOrCreateUserObsStreamKey(session.user.id);
    } catch {
      streamKey = null;
    }
  } else if (!streamKey) {
    const resolved = await resolveObsStreamKeyForChannel(channelId, {
      viewerUserId: session.user.id,
    });
    streamKey = resolved.streamKey;
  }

  if (!streamKey) return new NextResponse("No stream key", { status: 404 });

  const onAir = await isSrsStreamOnAir(streamKey);
  if (!onAir) {
    return new NextResponse("Stream not publishing", { status: 404 });
  }

  const upstreamUrl = buildFlvPlaybackUrl(streamKey);

  try {
    const upstream = await fetch(upstreamUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
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
        "Access-Control-Allow-Origin": "*",
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
