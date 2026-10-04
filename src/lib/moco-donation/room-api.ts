import { db } from "@/lib/db";
import { toMocoDonationPayload } from "@/lib/moco-donation/payload";
import {
  cancelQueuedVideoDonation,
  deleteQueuedVideoDonation,
  skipMocoDonation,
} from "@/lib/moco-donation/service";
import { relayMocoDonationEvent } from "@/lib/moco-donation-socket-relay";
import {
  normalizeVideoMaxSec,
  normalizeVideoRateCenti,
  parseMocoInputToCenti,
} from "@/lib/moco-donation/video-pricing";

async function channelHost(channelId: string) {
  return db.voiceChannel.findUnique({
    where: { id: channelId },
    select: {
      createdBy: true,
      isLive: true,
      videoDonationEnabled: true,
      videoDonationMaxSec: true,
      videoDonationRateCentiPer10Sec: true,
    },
  });
}

export async function getVideoDonationRoomState(channelId: string, userId: string) {
  const channel = await channelHost(channelId);
  if (!channel) return null;
  const rows = await db.mocoDonation.findMany({
    where: { channelId, type: "VIDEO", status: { in: ["PENDING", "PLAYING"] } },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { username: true } } },
  });
  const mapped = rows.map(toMocoDonationPayload);
  return {
    isHost: channel.createdBy === userId,
    pendingCount: rows.filter((r) => r.status === "PENDING").length,
    playing: mapped.find((r) => r.status === "PLAYING") ?? null,
    queue: mapped.filter((r) => r.status === "PENDING"),
    mine: mapped.filter((r) => r.senderId === userId),
    settings: {
      enabled: channel.videoDonationEnabled,
      maxSec: channel.videoDonationMaxSec,
      rateCentiPer10Sec: channel.videoDonationRateCentiPer10Sec,
    },
  };
}

export async function applyVideoDonationAction(input: {
  channelId: string;
  userId: string;
  action: string;
  donationId?: string;
  volume?: number;
  enabled?: boolean;
  maxSec?: number;
  rateMoco?: string;
}) {
  const channel = await channelHost(input.channelId);
  if (!channel) return { ok: false as const, error: "Stream not found.", status: 404 };
  const isHost = channel.createdBy === input.userId;

  if (input.action === "cancel") {
    if (!input.donationId) return { ok: false as const, error: "Required field missing.", status: 400 };
    const result = await cancelQueuedVideoDonation({ userId: input.userId, donationId: input.donationId });
    if (!result.ok) return { ok: false as const, error: result.error, status: 400 };
    return { ok: true as const };
  }

  if (!isHost) return { ok: false as const, error: "Only the host can do that.", status: 403 };

  if (input.action === "skip") {
    if (!input.donationId) return { ok: false as const, error: "Required field missing.", status: 400 };
    const result = await skipMocoDonation({ hostUserId: input.userId, donationId: input.donationId });
    if (!result.ok) return { ok: false as const, error: result.error, status: 400 };
    return { ok: true as const };
  }

  if (input.action === "delete") {
    if (!input.donationId) return { ok: false as const, error: "Required field missing.", status: 400 };
    const result = await deleteQueuedVideoDonation({ hostUserId: input.userId, donationId: input.donationId });
    if (!result.ok) return { ok: false as const, error: result.error, status: 400 };
    return { ok: true as const };
  }

  if (input.action === "pause" || input.action === "resume" || input.action === "volume") {
    const volume =
      input.action === "volume" ? Math.max(0, Math.min(100, Math.floor(input.volume ?? 100))) : undefined;
    await relayMocoDonationEvent(input.channelId, {
      event: "donation_player_control",
      control: { action: input.action, volume },
    });
    return { ok: true as const };
  }

  if (input.action === "settings") {
    const rate =
      input.rateMoco != null && input.rateMoco !== ""
        ? parseMocoInputToCenti(input.rateMoco)
        : channel.videoDonationRateCentiPer10Sec;
    if (rate == null || rate <= 0) {
      return { ok: false as const, error: "Enter a price like 0.1 MOCO per 10 seconds.", status: 400 };
    }
    await db.voiceChannel.update({
      where: { id: input.channelId },
      data: {
        videoDonationEnabled: input.enabled ?? channel.videoDonationEnabled,
        videoDonationMaxSec:
          input.maxSec != null ? normalizeVideoMaxSec(input.maxSec) : channel.videoDonationMaxSec,
        videoDonationRateCentiPer10Sec: normalizeVideoRateCenti(rate),
      },
    });
    return { ok: true as const };
  }

  return { ok: false as const, error: "Unknown action.", status: 400 };
}
