import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { liveViewerCutoff } from "@/lib/live-presence";
import { resolveExternalEmbed } from "@/lib/live-external/parse";
import { isPaymentsConfigured } from "@/lib/payments";
import {
  canViewerEnterLiveRoom,
  isHostBroadcastRoom,
  isPubliclyLive,
} from "@/lib/live-channel-active";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await rateLimitPublicApi(req, "mobile-live-detail", 60);
  if (limited) return limited;

  const viewerId = await getMobileUserId(req);
  const { id } = await params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const channel = await db.voiceChannel.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      createdBy: true,
      isLive: true,
      liveStatus: true,
      category: true,
      tags: true,
      thumbnailUrl: true,
      broadcastMode: true,
      mediaSourceType: true,
      externalProvider: true,
      externalId: true,
      externalWatchUrl: true,
      description: true,
      createdAt: true,
      donationAlertsOnStream: true,
      members: {
        where: { lastSeenAt: { gte: liveViewerCutoff() } },
        select: { id: true },
      },
    },
  });

  if (!channel) {
    return NextResponse.json({ error: "라이브를 찾을 수 없습니다." }, { status: 404 });
  }

  const host = await db.user.findUnique({
    where: { id: channel.createdBy },
    select: {
      id: true,
      username: true,
      image: true,
      name: true,
      supportTierReceived: true,
      totalSupportReceived: true,
    },
  });

  const liveStatus = channel.liveStatus ?? (channel.isLive ? "LIVE" : "ENDED");
  const onAir = isPubliclyLive({ isLive: channel.isLive, liveStatus });
  const isHost = !!viewerId && channel.createdBy === viewerId;
  const canEnter =
    (isHost && isHostBroadcastRoom({ liveStatus })) ||
    (!isHost && canViewerEnterLiveRoom({ isLive: channel.isLive, liveStatus }));

  const isExternal =
    channel.mediaSourceType === "EXTERNAL" || channel.broadcastMode === "EXTERNAL";

  let external: {
    provider: string;
    embedUrl: string | null;
    watchUrl: string;
    embedSupported: boolean;
  } | null = null;

  if (isExternal) {
    const resolved = resolveExternalEmbed({
      externalProvider: channel.externalProvider,
      externalId: channel.externalId,
    });
    if (resolved) {
      external = {
        provider: resolved.provider,
        embedUrl: resolved.embedUrl,
        watchUrl: channel.externalWatchUrl || resolved.watchUrl,
        embedSupported: resolved.embedSupported,
      };
    }
  }

  return NextResponse.json({
    item: {
      id: channel.id,
      title: channel.name,
      description: channel.description,
      thumbnailUrl: channel.thumbnailUrl,
      viewerCount: channel.members.length,
      category: channel.category,
      tags: channel.tags ?? [],
      broadcastMode: channel.broadcastMode ?? null,
      mediaSourceType: channel.mediaSourceType ?? null,
      isLive: onAir,
      liveStatus,
      canEnter,
      isHost,
      isExternal,
      external,
      paymentsEnabled: isPaymentsConfigured(),
      streamStartedAt: channel.createdAt.toISOString(),
      donationAlertsOnStream: channel.donationAlertsOnStream === true,
      host: host
        ? {
            id: host.id,
            username: host.username,
            image: host.image,
            name: host.name,
          }
        : { id: channel.createdBy, username: "host", image: null, name: null },
    },
  });
}
