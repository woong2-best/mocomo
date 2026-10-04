import type { MocoDonationType } from "@prisma/client";
import { db } from "@/lib/db";
import { filterLiveChatContent } from "@/lib/live-chat-filter";
import { ensureStringArray } from "@/lib/ensure-array";
import { consumeGemPurchaseCenti, consumeGemsFifo, InsufficientGemsBalanceError, refundGiftEventCenti } from "@/lib/gems/fifo";
import { syncUserGemBalance } from "@/lib/gems/balance";
import { creditSettlementMoco, creditSettlementMocoCentiInTx } from "@/lib/settlement-moco/economy";
import { splitCenti } from "@/lib/moco-donation/video-pricing";
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
import { mocoToTenths, parseSpendableMoco, splitUnsignedTenths } from "@/lib/moco/decimal-amount";

export type CreateMocoDonationInput = {
  userId: string;
  streamerId: string;
  mocoAmount?: number;
  type: MocoDonationType;
  mediaUrl?: string;
  message?: string;
  sfxKey?: string;
  playSec?: number;
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
  let mocoAmount = parseSpendableMoco(input.mocoAmount ?? 0) ?? 0;
  let videoTitle: string | null = null;
  let startSec = 0;
  let endSec: number | null = null;
  let playToEnd = false;
  let segmentPlaySec: number | null = null;
  let maxPlaySec = 60;
  let sfxKey: string | null = null;
  let mocoCenti = 0;

  if (type === "VIDEO") {
    const raw = input.mediaUrl?.trim() ?? "";
    if (!raw) return { success: false, error: "Video URL is required." };

    const prepared = await prepareMocoVideoDonation({
      channelId: target.channelId,
      mediaUrl: raw,
      playSec: input.playSec,
      startSec: input.startSec,
      endSec: input.endSec,
      playToEnd: input.playToEnd,
    });
    if (!prepared.ok) {
      return { success: false, error: prepared.error, code: prepared.code };
    }

    mediaUrl = prepared.mediaUrl;
    videoTitle = prepared.videoTitle;
    mocoCenti = prepared.quote.mocoCenti;
    mocoAmount = mocoCenti / 100;
    startSec = prepared.startSec;
    endSec = prepared.endSec;
    playToEnd = false;
    segmentPlaySec = prepared.quote.playSec;
    maxPlaySec = prepared.maxPlaySec;
  } else if (type === "SFX") {
    const key = input.sfxKey?.trim();
    if (!key || !isValidDonationSfxKey(key)) {
      return { success: false, error: "Select a valid sound effect.", code: "INVALID_SFX" };
    }
    sfxKey = resolveDonationSfx(key).id;
    const min = MOCO_DONATION_MIN_AMOUNT.SFX;
    const parsed = parseSpendableMoco(mocoAmount);
    if (parsed == null || parsed < min || parsed > MOCO_DONATION_MAX_AMOUNT) {
      return {
        success: false,
        error: `MOCO는 ${min}~${MOCO_DONATION_MAX_AMOUNT.toLocaleString()} 범위여야 합니다.`,
      };
    }
    if (!message) {
      return { success: false, error: "Enter a message to show on the stream." };
    }
    mocoAmount = parsed;
  } else {
    return { success: false, error: "Unsupported donation type." };
  }

  if (message) {
    const filtered = filterLiveChatContent(message, ensureStringArray(target.chatBannedWords));
    if (!filtered.ok) return { success: false, error: filtered.error };
    message = filtered.text;
  }

  try {
    const centiParts = type === "VIDEO" ? splitCenti(mocoCenti) : null;
    const parts =
      centiParts ?? splitUnsignedTenths(mocoToTenths(mocoAmount) ?? 0);
    if (parts.whole === 0 && parts.tenths === 0 && (centiParts?.hundredths ?? 0) === 0) {
      return { success: false, error: "Invalid MOCO amount." };
    }

    const { donation } = await db.$transaction(async (tx) => {
      const giftEvent = await tx.giftEvent.create({
        data: {
          fanId: input.userId,
          creatorId: target.streamerId,
          gems: parts.whole,
          gemsTenths: parts.tenths,
          gemsHundredths: centiParts?.hundredths ?? 0,
          source: "live_moco_donation",
          contentId: target.channelId,
        },
      });

      if (centiParts) {
        await consumeGemPurchaseCenti(tx, input.userId, mocoCenti, async ({ gemPurchaseId, centi }) => {
          const used = splitCenti(centi);
          await tx.giftEventAllocation.create({
            data: {
              giftEventId: giftEvent.id,
              gemPurchaseId,
              gemsUsed: used.whole,
              gemsUsedTenths: used.tenths,
              gemsUsedHundredths: used.hundredths,
            },
          });
        });
      } else {
        await consumeGemsFifo(input.userId, mocoAmount, giftEvent.id, tx);
      }

      const donation = await tx.mocoDonation.create({
        data: {
          channelId: target.channelId,
          streamerId: target.streamerId,
          userId: input.userId,
          mocoAmount: parts.whole,
          mocoAmountTenths: parts.tenths,
          mocoAmountHundredths: centiParts?.hundredths ?? 0,
          mocoCenti: centiParts ? mocoCenti : parts.whole * 100 + parts.tenths * 10,
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

    if (type !== "VIDEO") {
      await creditSettlementMoco({
        userId: target.streamerId,
        amount: mocoAmount,
        reason: "MOCO live donation (SFX)",
        referenceType: "gift_event",
        referenceId: donation.giftEventId!,
        metadata: { source: "live_moco_donation", type, channelId: target.channelId },
      });
    }

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
  if (row.type === "VIDEO" && row.status !== "PLAYING") {
    return { ok: false, error: "Skip only applies to the video that is playing." };
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

/** Records the moment the creator screen actually starts playback. Refunds are refused after this. */
export async function markMocoDonationPlaying(donationId: string, channelId: string) {
  const row = await db.mocoDonation.findUnique({ where: { id: donationId } });
  if (!row || row.channelId !== channelId || row.status !== "PENDING") return null;

  const playedAt = new Date();
  return db.mocoDonation.update({
    where: { id: donationId },
    data: { status: "PLAYING", playedAt },
    include: { user: { select: { username: true } } },
  });
}

export async function completeMocoDonation(donationId: string, channelId: string) {
  const row = await db.mocoDonation.findUnique({ where: { id: donationId } });
  if (!row || row.channelId !== channelId) return null;
  if (row.status !== "PLAYING" || !row.playedAt) return null;

  return db.mocoDonation.update({
    where: { id: donationId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
    },
    include: { user: { select: { username: true } } },
  });
}

type RefundReason = "USER_CANCEL" | "HOST_QUEUE_DELETE" | "STREAM_ENDED";

async function refundPendingVideoDonation(
  donationId: string,
  reason: RefundReason,
  actor: { userId?: string; hostId?: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const row = await db.mocoDonation.findUnique({ where: { id: donationId } });
  if (!row || row.type !== "VIDEO") return { ok: false, error: "Donation not found." };
  if (actor.userId && row.userId !== actor.userId) {
    return { ok: false, error: "You can only cancel your own donation." };
  }
  if (actor.hostId && row.streamerId !== actor.hostId) {
    return { ok: false, error: "Only the host can remove a queued video." };
  }
  if (row.playedAt || row.status !== "PENDING") {
    return { ok: false, error: "Playback has already started, so this donation cannot be cancelled." };
  }
  if (!row.giftEventId) return { ok: false, error: "Donation not found." };

  const updated = await db.$transaction(async (tx) => {
    const claimed = await tx.mocoDonation.updateMany({
      where: { id: row.id, status: "PENDING", playedAt: null, refundedAt: null },
      data: {
        status: "CANCELLED",
        refundedAt: new Date(),
        refundReason: reason,
        completedAt: new Date(),
      },
    });
    if (claimed.count !== 1) return false;
    await refundGiftEventCenti(tx, row.giftEventId!, row.userId);
    return true;
  });
  if (!updated) return { ok: false, error: "This donation is no longer in the queue." };

  const fresh = await db.mocoDonation.findUnique({
    where: { id: row.id },
    include: { user: { select: { username: true } } },
  });
  if (fresh) {
    void relayMocoDonationEvent(row.channelId, {
      event: "donation_cancelled",
      donation: toMocoDonationPayload(fresh),
    });
  }
  return { ok: true };
}

export async function cancelQueuedVideoDonation(input: { userId: string; donationId: string }) {
  return refundPendingVideoDonation(input.donationId, "USER_CANCEL", { userId: input.userId });
}

export async function deleteQueuedVideoDonation(input: { hostUserId: string; donationId: string }) {
  return refundPendingVideoDonation(input.donationId, "HOST_QUEUE_DELETE", { hostId: input.hostUserId });
}

/**
 * Stream end: settle donations whose playback started, refund the rest.
 * Safe to call more than once for the same channel.
 */
export async function finalizeVideoDonationsForChannel(channelId: string): Promise<{
  settled: number;
  refunded: number;
}> {
  const rows = await db.mocoDonation.findMany({
    where: {
      channelId,
      type: "VIDEO",
      OR: [
        { status: "PENDING", refundedAt: null },
        {
          playedAt: { not: null },
          settledAt: null,
          status: { in: ["PLAYING", "COMPLETED", "SKIPPED"] },
        },
      ],
    },
    select: {
      id: true,
      status: true,
      playedAt: true,
      streamerId: true,
      mocoCenti: true,
      giftEventId: true,
      userId: true,
    },
  });

  let settled = 0;
  let refunded = 0;
  for (const row of rows) {
    if (row.playedAt && row.status !== "PENDING") {
      const did = await db.$transaction(async (tx) => {
        const claimed = await tx.mocoDonation.updateMany({
          where: { id: row.id, settledAt: null, playedAt: { not: null } },
          data: {
            settledAt: new Date(),
            ...(row.status === "PLAYING" ? { status: "COMPLETED" as const, completedAt: new Date() } : {}),
          },
        });
        if (claimed.count !== 1) return false;
        await creditSettlementMocoCentiInTx(tx, {
          userId: row.streamerId,
          centi: row.mocoCenti,
          reason: "Video donation settled at stream end",
          referenceType: "video_donation_settle",
          referenceId: row.id,
          metadata: { channelId, giftEventId: row.giftEventId },
        });
        return true;
      });
      if (did) settled += 1;
      continue;
    }

    if (row.status === "PENDING" && !row.playedAt) {
      const result = await refundPendingVideoDonation(row.id, "STREAM_ENDED", {});
      if (result.ok) refunded += 1;
    }
  }
  return { settled, refunded };
}
