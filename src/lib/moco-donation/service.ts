import type { MocoDonationType } from "@prisma/client";
import { db } from "@/lib/db";
import { filterLiveChatContent } from "@/lib/live-chat-filter";
import { ensureStringArray } from "@/lib/ensure-array";
import { consumeGemsFifo, InsufficientGemsBalanceError } from "@/lib/gems/fifo";
import { syncUserGemBalance } from "@/lib/gems/balance";
import { creditSettlementMoco } from "@/lib/settlement-moco/economy";
import { relayMocoDonationEvent } from "@/lib/moco-donation-socket-relay";
import {
  MOCO_DONATION_MAX_AMOUNT,
  MOCO_DONATION_MIN_AMOUNT,
} from "@/lib/moco-donation/constants";
import { resolveStreamerTarget } from "@/lib/moco-donation/resolve-streamer";
import { toMocoDonationPayload } from "@/lib/moco-donation/payload";
import { prepareMocoVideoDonation } from "@/lib/moco-donation/prepare-video-donation";
import { isValidDonationSfxKey, resolveDonationSfx } from "@/lib/moco-donation/sfx-catalog";
import { assertCreatorPayoutsEnabled } from "@/lib/creator-payout-ready";

export type CreateMocoDonationInput = {
  userId: string;
  streamerId: string;
  mocoAmount?: number;
  type: MocoDonationType;
  mediaUrl?: string;
  message?: string;
  sfxKey?: string;
  startSec?: number;
  endSec?: number | null;
  playToEnd?: boolean;
  /** @deprecated */
  ttsVoice?: string;
};

export async function createMocoDonation(
  input: CreateMocoDonationInput
): Promise<
  | { success: true; donationId: string; remainingMoco: number; channelId: string }
  | { success: false; error: string; code?: string }
> {
  const type = input.type;

  if (type === "TTS") {
    return {
      success: false,
      error: "TTS donations are no longer available. Use sound effect (SFX) support instead.",
      code: "TTS_DEPRECATED",
    };
  }

  if (type === "CHAT") {
    return {
      success: false,
      error: "Chat donations are no longer available. Use sound effect (SFX) support instead.",
      code: "CHAT_DEPRECATED",
    };
  }

  const target = await resolveStreamerTarget(input.streamerId);
  if (!target.ok) return { success: false, error: target.error };
  if (!target.isLive) {
    return { success: false, error: "Donations are only available while the stream is live." };
  }

  const { assertLiveDonationsAllowed } = await import("@/lib/streaming-accounts/donation-guard");
  const donationCheck = await assertLiveDonationsAllowed(target.channelId);
  if (!donationCheck.ok) {
    return { success: false, error: donationCheck.error };
  }

  if (input.userId === target.streamerId) {
    return { success: false, error: "You cannot donate to your own stream." };
  }

  const payout = await assertCreatorPayoutsEnabled(target.streamerId);
  if (!payout.ok) {
    return { success: false, error: payout.error, code: payout.code };
  }

  let mediaUrl: string | null = null;
  let message = input.message?.trim().slice(0, 500) || null;
  let mocoAmount = Math.floor(Number(input.mocoAmount) || 0);
  let videoTitle: string | null = null;
  let startSec = 0;
  let endSec: number | null = null;
  let playToEnd = false;
  let segmentPlaySec: number | null = null;
  let maxPlaySec = 60;
  let sfxKey: string | null = null;

  if (type === "VIDEO") {
    const raw = input.mediaUrl?.trim() ?? "";
    if (!raw) return { success: false, error: "Video URL is required." };

    const prepared = await prepareMocoVideoDonation({
      channelId: target.channelId,
      mediaUrl: raw,
      startSec: input.startSec,
      endSec: input.endSec,
      playToEnd: input.playToEnd,
    });
    if (!prepared.ok) {
      return { success: false, error: prepared.error, code: prepared.code };
    }

    mediaUrl = prepared.mediaUrl;
    videoTitle = prepared.videoTitle;
    mocoAmount = prepared.mocoAmount;
    startSec = prepared.startSec;
    endSec = prepared.endSec;
    playToEnd = prepared.playToEnd;
    segmentPlaySec = prepared.segmentSec;
    maxPlaySec = prepared.maxPlaySec;
  } else if (type === "SFX") {
    const key = input.sfxKey?.trim();
    if (!key || !isValidDonationSfxKey(key)) {
      return { success: false, error: "Select a valid sound effect.", code: "INVALID_SFX" };
    }
    sfxKey = resolveDonationSfx(key).id;
    const min = MOCO_DONATION_MIN_AMOUNT.SFX;
    if (!Number.isInteger(mocoAmount) || mocoAmount < min || mocoAmount > MOCO_DONATION_MAX_AMOUNT) {
      return {
        success: false,
        error: `MOCO는 ${min}~${MOCO_DONATION_MAX_AMOUNT.toLocaleString()} 범위여야 합니다.`,
      };
    }
    if (!message) {
      return { success: false, error: "Enter a message to show on the stream." };
    }
  } else {
    return { success: false, error: "Unsupported donation type." };
  }

  if (message) {
    const filtered = filterLiveChatContent(message, ensureStringArray(target.chatBannedWords));
    if (!filtered.ok) return { success: false, error: filtered.error };
    message = filtered.text;
  }

  try {
    const { donation } = await db.$transaction(async (tx) => {
      const giftEvent = await tx.giftEvent.create({
        data: {
          fanId: input.userId,
          creatorId: target.streamerId,
          gems: mocoAmount,
          source: "live_moco_donation",
          contentId: target.channelId,
        },
      });

      await consumeGemsFifo(input.userId, mocoAmount, giftEvent.id, tx);

      const donation = await tx.mocoDonation.create({
        data: {
          channelId: target.channelId,
          streamerId: target.streamerId,
          userId: input.userId,
          mocoAmount,
          type,
          mediaUrl,
          message,
          sfxKey,
          videoTitle,
          startSec,
          endSec,
          playToEnd,
          segmentPlaySec,
          maxPlaySec,
          giftEventId: giftEvent.id,
        },
        include: {
          user: { select: { username: true } },
        },
      });

      return { donation, giftEventId: giftEvent.id };
    });

    await creditSettlementMoco({
      userId: target.streamerId,
      amount: mocoAmount,
      reason: "MOCO live donation (SFX · video)",
      referenceType: "gift_event",
      referenceId: donation.giftEventId!,
      metadata: { source: "live_moco_donation", type, channelId: target.channelId },
    });

    const balance = await syncUserGemBalance(input.userId);
    const payload = toMocoDonationPayload(donation);

    void relayMocoDonationEvent(target.channelId, { event: "new_donation", donation: payload });

    return {
      success: true,
      donationId: donation.id,
      remainingMoco: balance,
      channelId: target.channelId,
    };
  } catch (err) {
    if (err instanceof InsufficientGemsBalanceError) {
      return { success: false, error: "Insufficient MOCO balance.", code: "INSUFFICIENT_MOCO" };
    }
    throw err;
  }
}

export async function skipMocoDonation(input: {
  hostUserId: string;
  donationId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await db.mocoDonation.findUnique({
    where: { id: input.donationId },
    include: { user: { select: { username: true } } },
  });
  if (!row) return { ok: false, error: "Donation not found." };
  if (row.streamerId !== input.hostUserId) {
    return { ok: false, error: "Only the host can skip." };
  }
  if (row.status !== "PENDING" && row.status !== "PLAYING") {
    return { ok: false, error: "Cannot skip in the current state." };
  }

  const updated = await db.mocoDonation.update({
    where: { id: row.id },
    data: { status: "SKIPPED", completedAt: new Date() },
    include: { user: { select: { username: true } } },
  });

  const payload = toMocoDonationPayload(updated);
  void relayMocoDonationEvent(row.channelId, { event: "donation_skipped", donation: payload });

  return { ok: true };
}

export async function markMocoDonationPlaying(donationId: string, channelId: string) {
  const row = await db.mocoDonation.findUnique({ where: { id: donationId } });
  if (!row || row.channelId !== channelId || row.status !== "PENDING") return null;

  return db.mocoDonation.update({
    where: { id: donationId },
    data: { status: "PLAYING", playedAt: new Date() },
    include: { user: { select: { username: true } } },
  });
}

export async function completeMocoDonation(donationId: string, channelId: string) {
  const row = await db.mocoDonation.findUnique({ where: { id: donationId } });
  if (!row || row.channelId !== channelId) return null;
  if (row.status !== "PLAYING" && row.status !== "PENDING") return null;

  return db.mocoDonation.update({
    where: { id: donationId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      ...(row.playedAt ? {} : { playedAt: new Date() }),
    },
    include: { user: { select: { username: true } } },
  });
}
