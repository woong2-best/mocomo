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
      error: "TTS 도네이션은 종료되었습니다. 효과음(SFX) 후원을 이용해 주세요.",
      code: "TTS_DEPRECATED",
    };
  }

  if (type === "CHAT") {
    return {
      success: false,
      error: "채팅 후원은 종료되었습니다. 효과음(SFX) 후원을 이용해 주세요.",
      code: "CHAT_DEPRECATED",
    };
  }

  const target = await resolveStreamerTarget(input.streamerId);
  if (!target.ok) return { success: false, error: target.error };
  if (!target.isLive) {
    return { success: false, error: "방송 중일 때만 도네이션할 수 있습니다." };
  }

  const { assertLiveDonationsAllowed } = await import("@/lib/streaming-accounts/donation-guard");
  const donationCheck = await assertLiveDonationsAllowed(target.channelId);
  if (!donationCheck.ok) {
    return { success: false, error: donationCheck.error };
  }

  if (input.userId === target.streamerId) {
    return { success: false, error: "자기 방송에는 도네이션할 수 없습니다." };
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
    if (!raw) return { success: false, error: "영상 URL이 필요합니다." };

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
      return { success: false, error: "유효한 효과음을 선택해 주세요.", code: "INVALID_SFX" };
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
      return { success: false, error: "방송 화면에 표시할 메시지를 입력해 주세요." };
    }
  } else {
    return { success: false, error: "지원하지 않는 후원 유형입니다." };
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
      reason: "MOCO 라이브 도네이션 (SFX·영상)",
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
      return { success: false, error: "MOCO 잔액이 부족합니다.", code: "INSUFFICIENT_MOCO" };
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
  if (!row) return { ok: false, error: "도네이션을 찾을 수 없습니다." };
  if (row.streamerId !== input.hostUserId) {
    return { ok: false, error: "호스트만 스킵할 수 있습니다." };
  }
  if (row.status !== "PENDING" && row.status !== "PLAYING") {
    return { ok: false, error: "스킵할 수 없는 상태입니다." };
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
