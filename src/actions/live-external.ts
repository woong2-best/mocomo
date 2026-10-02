import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

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
import { checkYoutubeMadeForKids } from "@/lib/live-external/youtube-kids";
import { probeChzzkEmbed } from "@/lib/live-external/chzzk-probe";
import { mintOverlayToken, overlayBroadcastSid } from "@/lib/live-external/overlay-token";
import { buildYoutubeNativeObsChatSetup } from "@/lib/live-external/youtube-obs-chat";
import { platformToLiveExternal } from "@/lib/streaming-accounts/types";
import {
  getAccountTokens,
  resolveVerifiedLiveSource,
} from "@/lib/streaming-accounts/service";
import { getServerTranslator } from "@/lib/i18n/server";
import type { MessageKey } from "@/lib/i18n/messages";

export async function createExternalLiveStream(data: {
  /** Optional — ignored when platform title is available. */
  name?: string;
  /** 인증된 ConnectedStreamingAccount ID — URL 직접 입력 금지 */
  connectedAccountId: string;
  category?: LiveStreamCategory;
  description?: string;
  thumbnailUrl?: string;
  liveVisibility?: LiveVisibility;
  minViewerTier?: SupportTierLevel;
  goLive?: boolean;
}) {
  try {
    const { t } = await getServerTranslator();
    if (!isExternalLiveEnabled()) {
      return { error: t("live.external.disabled") };
    }

    const user = await requireAuthMinimal();
    const hostCheck = await assertLiveHostEligible(user.id);
    if (!hostCheck.ok) return { error: hostCheck.error };

    const accountId = data.connectedAccountId?.trim();
    if (!accountId) {
      return { error: t("live.external.pickAccount") };
    }

    const account = await db.connectedStreamingAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.userId !== user.id) {
      return { error: t("live.external.accountNotFound") };
    }
    if (!account.verified || account.revokedAt) {
      return { error: t("live.external.accountUnverified") };
    }

    const liveProvider = platformToLiveExternal(account.platform);
    if (!liveProvider) {
      return { error: t("live.external.platformUnsupported") };
    }

    const resolved = await resolveVerifiedLiveSource(accountId, user.id);
    if ("errorKey" in resolved && resolved.errorKey) {
      return { error: t(resolved.errorKey as MessageKey) };
    }
    if ("error" in resolved && resolved.error) return { error: resolved.error };
    const parsed = resolved;

    if (parsed.provider === "YOUTUBE") {
      const tokens = await getAccountTokens(account);
      const kids = await checkYoutubeMadeForKids(parsed.externalId, {
        accessToken: tokens?.accessToken,
      });
      if (!kids.ok) return { error: kids.error };
      if (kids.madeForKids) {
        return {
          error:
            t("actions.made_for_kids_youtube"),
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

    const profileDefaults = await db.streamerProfile.findUnique({
      where: { userId: user.id },
      select: { defaultCategory: true },
    });
    const resolvedCategory =
      data.category && data.category !== "VIRTUAL"
        ? data.category
        : profileDefaults?.defaultCategory && profileDefaults.defaultCategory !== "VIRTUAL"
          ? profileDefaults.defaultCategory
          : "JUST_CHATTING";

    // Title/description come from YouTube/Twitch/Chzzk — no manual MoCoMo fields.
    const { fetchExternalPlatformMetadata } = await import(
      "@/lib/live-external/platform-metadata"
    );
    const platformMeta = await fetchExternalPlatformMetadata(
      parsed.provider,
      parsed.externalId
    );
    const title =
      platformMeta.title?.trim() ||
      data.name?.trim() ||
      t("home.featureLive", { v0: account.channelName });
    const description =
      platformMeta.description?.trim().slice(0, 500) ||
      data.description?.trim().slice(0, 500) ||
      null;

    const channel = await db.voiceChannel.create({
      data: {
        name: title.slice(0, 120),
        createdBy: user.id,
        maxUsers: 500,
        allowScreen: false,
        allowCamera: false,
        isLive: goLive,
        liveStatus: goLive ? "LIVE" : "SCHEDULED",
        category: resolvedCategory,
        description,
        thumbnailUrl: data.thumbnailUrl?.trim() || null,
        broadcastMode: "EXTERNAL",
        mediaSourceType: "EXTERNAL",
        externalProvider: parsed.provider,
        externalId: parsed.externalId,
        externalChannelId: account.channelId,
        externalWatchUrl: parsed.watchUrl,
        connectedStreamingAccountId: account.id,
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

    const broadcastSid = overlayBroadcastSid(channel.createdAt);
    const chatToken = mintOverlayToken(channel.id, "chat", { broadcastSid });
    const donationToken = mintOverlayToken(channel.id, "donation", { broadcastSid });

    return {
      channel,
      provider: parsed.provider,
      watchUrl: parsed.watchUrl,
      embedSupported: parsed.provider === "CHZZK" ? chzzkEmbedOk : parsed.embedSupported,
      overlay: {
        chatUrl: chatToken
          ? `/obs/chat/${channel.id}?token=${encodeURIComponent(chatToken)}`
          : null,
        donationUrl: donationToken
          ? `/overlay/donation/${channel.id}?token=${encodeURIComponent(donationToken)}`
          : null,
        mocoWidgetUrl: donationToken
          ? `/widget/alert?streamer_id=${encodeURIComponent(channel.id)}&token=${encodeURIComponent(donationToken)}`
          : null,
        youtubeNative:
          parsed.provider === "YOUTUBE"
            ? buildYoutubeNativeObsChatSetup(parsed.externalId, "")
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
    select: {
      createdBy: true,
      createdAt: true,
      externalProvider: true,
      externalId: true,
    },
  });
  if (!channel || channel.createdBy !== user.id) {
    return { error: t("actions.url_2") };
  }
  const broadcastSid = overlayBroadcastSid(channel.createdAt);
  const chatToken = mintOverlayToken(channelId, "chat", { broadcastSid });
  const donationToken = mintOverlayToken(channelId, "donation", { broadcastSid });
  if (!chatToken || !donationToken) {
    return { error: t("actions.live_overlay_secret_auth_secret") };
  }

  const youtubeNative =
    channel.externalProvider === "YOUTUBE" && channel.externalId
      ? buildYoutubeNativeObsChatSetup(channel.externalId, "")
      : null;

  return {
    chatUrl: `/obs/chat/${channelId}?token=${encodeURIComponent(chatToken)}`,
    donationUrl: `/overlay/donation/${channelId}?token=${encodeURIComponent(donationToken)}`,
    mocoWidgetUrl: `/widget/alert?streamer_id=${encodeURIComponent(channelId)}&token=${encodeURIComponent(donationToken)}`,
    youtubeNative,
  };
}

/** Live Studio — mint OBS chat URL for the host's current live/scheduled broadcast. */
export async function mintStudioObsChatUrl() {
  const user = await requireAuthMinimal();
  const { activeHostBroadcastWhere } = await import(
    "@/lib/live-broadcast/session-queries"
  );
  const channel = await db.voiceChannel.findFirst({
    where: activeHostBroadcastWhere(user.id),
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!channel) {
    const { t } = await getServerTranslator();
    return { errorKey: "live.obsChat.noActiveBroadcast" as const, error: t("live.obsChat.noActiveBroadcast") };
  }
  return mintLiveOverlayUrls(channel.id);
}

export async function getVerifiedStreamingAccountsForLive() {
  const user = await requireAuthMinimal();
  const accounts = await db.connectedStreamingAccount.findMany({
    where: {
      userId: user.id,
      verified: true,
      revokedAt: null,
      platform: { in: ["YOUTUBE", "TWITCH"] },
    },
    orderBy: { channelName: "asc" },
    select: {
      id: true,
      platform: true,
      channelId: true,
      channelName: true,
      channelUrl: true,
      profileImage: true,
    },
  });
  return { accounts };
}
