import { db } from "@/lib/db";
import { activeHostBroadcastWhere } from "@/lib/live-broadcast/session-queries";
import {
  mintHostOverlayToken,
  mintOverlayToken,
  overlayBroadcastSid,
  verifyHostOverlayToken,
} from "@/lib/live-external/overlay-token";
import { buildYoutubeNativeObsChatSetup } from "@/lib/live-external/youtube-obs-chat";

export async function mintOverlayUrlsForOwner(userId: string, channelId: string) {
  const channel = await db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      createdBy: true,
      createdAt: true,
      externalProvider: true,
      externalId: true,
    },
  });
  if (!channel || channel.createdBy !== userId) {
    return { error: "actions.url_2" as const };
  }
  const broadcastSid = overlayBroadcastSid(channel.createdAt);
  const chatToken = mintOverlayToken(channelId, "chat", { broadcastSid });
  const donationToken = mintOverlayToken(channelId, "donation", { broadcastSid });
  if (!chatToken || !donationToken) {
    return { error: "actions.live_overlay_secret_auth_secret" as const };
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

/** Live Studio — stable OBS links that follow this host's current broadcast. */
export async function mintStudioObsChatForUser(userId: string) {
  const chatToken = mintHostOverlayToken(userId, "chat");
  const donationToken = mintHostOverlayToken(userId, "donation");
  if (!chatToken || !donationToken) {
    return { error: "actions.live_overlay_secret_auth_secret" as const };
  }
  return {
    chatUrl: `/obs/studio/chat?token=${encodeURIComponent(chatToken)}`,
    donationUrl: `/obs/studio/chat-tip?token=${encodeURIComponent(donationToken)}`,
    mocoWidgetUrl: `/obs/studio/video?token=${encodeURIComponent(donationToken)}`,
    youtubeNative: null,
  };
}

/** Host overlay token → the broadcast that is live right now, if any. */
export async function authorizeStudioOverlay(token: string, kind: "chat" | "donation") {
  const verified = verifyHostOverlayToken(token, kind);
  if (!verified.ok) return verified;
  const channel = await db.voiceChannel.findFirst({
    where: activeHostBroadcastWhere(verified.payload.hostUserId),
    orderBy: { createdAt: "desc" },
    select: { id: true, createdBy: true },
  });
  if (channel && channel.createdBy !== verified.payload.hostUserId) {
    return { ok: false as const, error: "Token audience does not match." };
  }
  return { ok: true as const, payload: verified.payload, channel };
}
