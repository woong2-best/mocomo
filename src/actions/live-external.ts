"use server";

import type { LiveStreamCategory, LiveVisibility, SupportTierLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuthMinimal } from "@/lib/auth";
import { assertLiveHostEligible } from "@/lib/live-host-eligibility";
import { formatLiveCreateError } from "@/lib/live-create-errors";
import { prepareHostForNewBroadcast } from "@/lib/live-broadcast/session-manager";
import { notifyFollowersOnLive } from "@/lib/live-notify";
import { revalidatePath, revalidateTag } from "next/cache";
import { liveRoomCacheTag } from "@/lib/cached-live-meta";
import { revalidateLiveHubCache } from "@/lib/live-hub-data";
import { isExternalLiveEnabled } from "@/lib/live-feature";
import { parseExternalLiveSource } from "@/lib/live-external/parse";
import { checkYoutubeMadeForKids } from "@/lib/live-external/youtube-kids";
import { probeChzzkEmbed } from "@/lib/live-external/chzzk-probe";
import { mintOverlayToken } from "@/lib/live-external/overlay-token";
import type { LiveExternalProvider } from "@/lib/live-external/types";

export async function createExternalLiveStream(data: {
  name: string;
  sourceUrl: string;
  providerHint?: LiveExternalProvider;
  category?: LiveStreamCategory;
  description?: string;
  thumbnailUrl?: string;
  liveVisibility?: LiveVisibility;
  minViewerTier?: SupportTierLevel;
  goLive?: boolean;
}) {
  try {
    if (!isExternalLiveEnabled()) {
      return { error: "외부 방송 연동이 비활성화되어 있습니다." };
    }

    const user = await requireAuthMinimal();
    const hostCheck = await assertLiveHostEligible(user.id);
    if (!hostCheck.ok) return { error: hostCheck.error };

    const parsed = parseExternalLiveSource(data.sourceUrl, {
      providerHint: data.providerHint,
    });
    if ("error" in parsed) return { error: parsed.error };

    if (parsed.provider === "YOUTUBE") {
      const kids = await checkYoutubeMadeForKids(parsed.externalId);
      if (!kids.ok) return { error: kids.error };
      if (kids.madeForKids) {
        return {
          error:
            "Made for Kids로 표시된 YouTube 영상은 정책상 임베드할 수 없습니다. 다른 라이브를 연결해 주세요.",
        };
      }
    }

    let chzzkEmbedOk = parsed.embedSupported;
    if (parsed.provider === "CHZZK") {
      const probe = await probeChzzkEmbed(parsed.externalId);
      chzzkEmbedOk = probe.recommendEmbed;
    }

    const prep = await prepareHostForNewBroadcast(user.id);
    if (!prep.ok) {
      return {
        error: prep.error,
        existingChannelId: prep.blockingChannelId,
      };
    }

    await db.voiceChannel.updateMany({
      where: {
        createdBy: user.id,
        isLive: false,
        liveStatus: { in: ["SCHEDULED", "LIVE"] },
      },
      data: { isLive: false, liveStatus: "ENDED", endedAt: new Date() },
    });

    const goLive = data.goLive !== false;
    const visibility = data.liveVisibility ?? "PUBLIC";
    const minTier =
      visibility === "PRIVATE" ? (data.minViewerTier ?? "BRONZE") : null;
    const title =
      data.name?.trim() ||
      `${parsed.provider} 라이브`;

    const channel = await db.voiceChannel.create({
      data: {
        name: title.slice(0, 120),
        createdBy: user.id,
        maxUsers: 500,
        allowScreen: false,
        allowCamera: false,
        isLive: goLive,
        liveStatus: goLive ? "LIVE" : "SCHEDULED",
        category: data.category ?? "JUST_CHATTING",
        description: data.description?.trim().slice(0, 500) || null,
        thumbnailUrl: data.thumbnailUrl?.trim() || null,
        broadcastMode: "EXTERNAL",
        mediaSourceType: "EXTERNAL",
        externalProvider: parsed.provider,
        externalId: parsed.externalId,
        externalWatchUrl: parsed.watchUrl,
        liveVisibility: visibility,
        minViewerTier: minTier,
        members: {
          create: {
            userId: user.id,
            role: "HOST",
            lastSeenAt: new Date(),
          },
        },
      },
    });

    try {
      await db.streamerProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });
    } catch {
      /* optional */
    }

    if (goLive) {
      afterNotify(user.id, channel.id, channel.name);
    }

    revalidatePath("/live");
    revalidateLiveHubCache();
    revalidateTag(liveRoomCacheTag(channel.id));

    const chatToken = mintOverlayToken(channel.id, "chat");
    const donationToken = mintOverlayToken(channel.id, "donation");

    return {
      channel,
      provider: parsed.provider,
      watchUrl: parsed.watchUrl,
      embedSupported: parsed.provider === "CHZZK" ? chzzkEmbedOk : parsed.embedSupported,
      overlay: {
        chatUrl: chatToken
          ? `/overlay/chat/${channel.id}?token=${encodeURIComponent(chatToken)}`
          : null,
        donationUrl: donationToken
          ? `/overlay/donation/${channel.id}?token=${encodeURIComponent(donationToken)}`
          : null,
      },
    };
  } catch (e) {
    console.error("[createExternalLiveStream]", e);
    return { error: formatLiveCreateError(e) };
  }
}

function afterNotify(hostId: string, channelId: string, title: string) {
  void notifyFollowersOnLive(hostId, channelId, title).catch(() => {});
}

export async function mintLiveOverlayUrls(channelId: string) {
  const user = await requireAuthMinimal();
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: { createdBy: true },
  });
  if (!channel || channel.createdBy !== user.id) {
    return { error: "호스트만 오버레이 URL을 발급할 수 있습니다." };
  }
  const chatToken = mintOverlayToken(channelId, "chat");
  const donationToken = mintOverlayToken(channelId, "donation");
  if (!chatToken || !donationToken) {
    return { error: "LIVE_OVERLAY_SECRET 또는 AUTH_SECRET이 필요합니다." };
  }
  return {
    chatUrl: `/overlay/chat/${channelId}?token=${encodeURIComponent(chatToken)}`,
    donationUrl: `/overlay/donation/${channelId}?token=${encodeURIComponent(donationToken)}`,
  };
}
