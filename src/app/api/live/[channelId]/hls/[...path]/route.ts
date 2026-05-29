import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSrsHlsBaseUrl, srsConfigError } from "@/lib/srs";
import {
  rewriteHlsPlaylist,
  upstreamHlsManifestUrl,
  upstreamSegmentUrl,
} from "@/lib/srs-hls-proxy";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";

async function getStreamKey(channelId: string) {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { isLive: true, rtmpStreamKey: true },
  });
  if (!channel?.isLive || !channel.rtmpStreamKey) return null;
  return channel.rtmpStreamKey;
}

/** HTTPS 프록시 — SRS HLS (m3u8·ts) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ channelId: string; path: string[] }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { channelId, path } = await params;
  if (!channelId || channelId.length > 64) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  if (srsConfigError()) {
    return new NextResponse("SRS not configured", { status: 503 });
  }

  const access = await resolveLiveChannelAccess(channelId, session.user.id);
  if (!access.allowed) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const streamKey = await getStreamKey(channelId);
  if (!streamKey) {
    return new NextResponse("Stream not ready", { status: 404 });
  }

  const pathStr = path?.join("/") ?? "";
  const isManifest =
    !pathStr ||
    pathStr === "index.m3u8" ||
    pathStr.endsWith(".m3u8");

  const upstreamUrl = isManifest
    ? upstreamHlsManifestUrl(streamKey)
    : upstreamSegmentUrl(pathStr);

  try {
    const upstream = await fetch(upstreamUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
      headers: req.headers.get("range")
        ? { Range: req.headers.get("range")! }
        : undefined,
    });

    if (!upstream.ok) {
      return new NextResponse(`Upstream ${upstream.status}`, { status: upstream.status });
    }

    const contentType =
      upstream.headers.get("content-type") ??
      (isManifest ? "application/vnd.apple.mpegurl" : "application/octet-stream");

    if (isManifest) {
      const text = await upstream.text();
      const rewritten = rewriteHlsPlaylist(text, channelId, getSrsHlsBaseUrl());
      return new NextResponse(rewritten, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-store, max-age=0",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      status: upstream.status,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store, max-age=0",
        ...(upstream.headers.get("content-length")
          ? { "Content-Length": upstream.headers.get("content-length")! }
          : {}),
      },
    });
  } catch (e) {
    console.error("[hls-proxy]", upstreamUrl, e);
    return new NextResponse("Proxy error", { status: 502 });
  }
}
