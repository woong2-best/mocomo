import { NextRequest, NextResponse } from "next/server";
import { rateLimitPublicApi } from "@/lib/api-security";
import { getMobileUserId } from "@/lib/api-mobile-auth";
import { db } from "@/lib/db";
import { liveViewerCutoff } from "@/lib/live-presence";
import { resolveExternalEmbed } from "@/lib/live-external/parse";
import { fetchExternalPlatformMetadata } from "@/lib/live-external/platform-metadata";
import { getCachedLiveTipsForChannel } from "@/lib/cached-live-tips";
import { isPaymentsConfigured } from "@/lib/payments";
import {
  canViewerEnterLiveRoom,
  isHostBroadcastRoom,
  isPubliclyLive,
} from "@/lib/live-channel-active";
import { resolveLiveChannelAccess } from "@/lib/live-room-access";
import { canViewNsfwContent, nsfwViewerSelect } from "@/lib/nsfw-viewer-access";

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
      donationGoalKrw: true,
      donationAlertsOnStream: true,
      isNsfw: true,
      contentRating: true,
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
  const adultStream = channel.isNsfw === true || channel.contentRating === "ADULT";
  let canEnter =
    (isHost && isHostBroadcastRoom({ liveStatus })) ||
    (!isHost && canViewerEnterLiveRoom({ isLive: channel.isLive, liveStatus }));
  let accessDeniedReason: "ADULT_VERIFICATION_REQUIRED" | "TIER_REQUIRED" | null = null;

  if (!isHost && adultStream && canEnter && viewerId) {
    const viewer = await db.user.findUnique({
      where: { id: viewerId },
      select: nsfwViewerSelect,
    });
    if (!viewer || !canViewNsfwContent(viewer)) {
      canEnter = false;
      accessDeniedReason = "ADULT_VERIFICATION_REQUIRED";
    }
  } else if (!isHost && adultStream && canEnter && !viewerId) {
    canEnter = false;
    accessDeniedReason = "ADULT_VERIFICATION_REQUIRED";
  }

  const isExternal =
    channel.mediaSourceType === "EXTERNAL" || channel.broadcastMode === "EXTERNAL";

  let external: {
    provider: string;
    embedUrl: string | null;
    watchUrl: string;
    embedSupported: boolean;
    platformTitle?: string | null;
    platformDescription?: string | null;
  } | null = null;

  if (isExternal) {
    const resolved = resolveExternalEmbed({
      externalProvider: channel.externalProvider,
      externalId: channel.externalId,
    });
    if (resolved) {
      const platformMeta = await fetchExternalPlatformMetadata(
        resolved.provider,
        resolved.externalId
      );
      external = {
        provider: resolved.provider,
        embedUrl: resolved.embedUrl,
        watchUrl: channel.externalWatchUrl || resolved.watchUrl,
        embedSupported: resolved.embedSupported,
        platformTitle: platformMeta.title ?? null,
        platformDescription: platformMeta.description ?? null,
      };
    }
  }

  const platformTitle = external?.platformTitle?.trim() || null;
  const platformDescription = external?.platformDescription?.trim() || null;

  const needFollow = !!viewerId && channel.createdBy !== viewerId;
  const [{ tipTotalKrw, tipRanking }, followRow, streamerProfile] = await Promise.all([
    getCachedLiveTipsForChannel(channel.createdBy, channel.createdAt),
    needFollow
      ? db.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: viewerId!,
              followingId: channel.createdBy,
            },
          },
          select: { followerId: true },
        })
      : Promise.resolve(null),
    db.streamerProfile.findUnique({
      where: { userId: channel.createdBy },
      select: { announcement: true },
    }),
  ]);

  return NextResponse.json({
    item: {
      id: channel.id,
      title: platformTitle || channel.name,
      description: platformDescription || channel.description,
      thumbnailUrl: channel.thumbnailUrl,
      viewerCount: channel.members.length,
      category: channel.category,
      tags: channel.tags ?? [],
      broadcastMode: channel.broadcastMode ?? null,
      mediaSourceType: channel.mediaSourceType ?? null,
      isLive: onAir,
      liveStatus,
      canEnter,
      accessDeniedReason,
      isNsfw: adultStream,
      contentRating: channel.contentRating ?? "GENERAL",
      isHost,
      isExternal,
      external,
      paymentsEnabled: isPaymentsConfigured(),
      streamStartedAt: channel.createdAt.toISOString(),
      donationAlertsOnStream: channel.donationAlertsOnStream === true,
      donationGoalKrw: channel.donationGoalKrw,
      tipTotalKrw,
      tipRanking,
      pinnedMessage: streamerProfile?.announcement?.trim() || null,
      hostFollowing: !!followRow,
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
