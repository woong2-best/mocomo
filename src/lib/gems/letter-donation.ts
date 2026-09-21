import { db } from "@/lib/db";
import { consumeGemsFifo, InsufficientGemsBalanceError } from "@/lib/gems/fifo";
import { syncUserGemBalance } from "@/lib/gems/balance";
import { MOCO_USD_CENTS } from "@/lib/gems/constants";
import { creditSettlementMoco } from "@/lib/settlement-moco/economy";
import {
  buildLetterDonationMessageBody,
  LETTER_DONATION_MESSAGE_MAX,
  LETTER_DONATION_MIN_MOCO,
} from "@/lib/chat-letter-donation";
import { notifyTip } from "@/lib/notifications";
import { tierFromAmount } from "@/lib/tiers";

export const LETTER_DONATION_GIFT_SOURCE = "letter_donation";

function gemsToAmountCents(gems: number) {
  return gems * MOCO_USD_CENTS;
}

async function updateSupportStats(senderId: string, receiverId: string, amountCents: number) {
  const existing = await db.creatorSupport.findUnique({
    where: { supporterId_creatorId: { supporterId: senderId, creatorId: receiverId } },
  });
  const newTotal = (existing?.totalAmount ?? 0) + amountCents;

  const [senderRow, receiverRow] = await Promise.all([
    db.user.findUnique({ where: { id: senderId }, select: { totalSupportSent: true } }),
    db.user.findUnique({ where: { id: receiverId }, select: { totalSupportReceived: true } }),
  ]);
  const newSent = (senderRow?.totalSupportSent ?? 0) + amountCents;
  const newReceived = (receiverRow?.totalSupportReceived ?? 0) + amountCents;

  const tier = tierFromAmount(newTotal);
  await db.user.update({
    where: { id: senderId },
    data: {
      totalSupportSent: newSent,
      supportTierSent: tierFromAmount(newSent),
    },
  });
  await db.user.update({
    where: { id: receiverId },
    data: {
      totalSupportReceived: newReceived,
      supportTierReceived: tierFromAmount(newReceived),
    },
  });

  await db.creatorSupport.upsert({
    where: { supporterId_creatorId: { supporterId: senderId, creatorId: receiverId } },
    create: { supporterId: senderId, creatorId: receiverId, totalAmount: amountCents, tier },
    update: { totalAmount: newTotal, tier },
  });

  const cosProfile = await db.cosplayerProfile.findUnique({ where: { userId: receiverId } });
  if (cosProfile) {
    await db.cosplayerProfile.update({
      where: { id: cosProfile.id },
      data: { totalTips: { increment: amountCents } },
    });
  }
}

/** Send a DM letter: debit sender MOCO now; credit receiver only when they open. */
export async function spendMocoOnLetterDonation(input: {
  fanId: string;
  creatorId: string;
  roomId: string;
  moco: number;
  message: string;
}) {
  if (input.fanId === input.creatorId) {
    return { error: "자기 자신에게 편지를 보낼 수 없습니다." as const };
  }
  if (!Number.isInteger(input.moco) || input.moco < LETTER_DONATION_MIN_MOCO) {
    return { error: `최소 ${LETTER_DONATION_MIN_MOCO} MOCO부터 보낼 수 있습니다.` as const };
  }

  const message = input.message.trim();
  if (!message) return { error: "편지 내용을 입력해 주세요." as const };
  if (message.length > LETTER_DONATION_MESSAGE_MAX) {
    return { error: `편지는 ${LETTER_DONATION_MESSAGE_MAX}자까지 입력할 수 있습니다.` as const };
  }

  const roomId = input.roomId.trim();
  if (!roomId) return { error: "메시지 방이 필요합니다." as const };

  const [member, creator] = await Promise.all([
    db.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId: input.fanId } },
      select: { userId: true },
    }),
    db.user.findUnique({
      where: { id: input.creatorId },
      select: { id: true, username: true },
    }),
  ]);
  if (!member) return { error: "메시지 방에 참여 중일 때만 편지를 보낼 수 있습니다." as const };
  if (!creator) return { error: "받는 사람을 찾을 수 없습니다." as const };

  const receiverMember = await db.chatMember.findUnique({
    where: { roomId_userId: { roomId, userId: input.creatorId } },
    select: { userId: true },
  });
  if (!receiverMember) {
    return { error: "받는 사람이 이 대화방에 없습니다." as const };
  }

  const amountCents = gemsToAmountCents(input.moco);

  try {
    const { tip, giftEvent } = await db.$transaction(async (tx) => {
      const tipRow = await tx.tip.create({
        data: {
          senderId: input.fanId,
          receiverId: input.creatorId,
          amount: amountCents,
          message,
          platformFee: 0,
        },
      });

      const giftEventRow = await tx.giftEvent.create({
        data: {
          fanId: input.fanId,
          creatorId: input.creatorId,
          gems: input.moco,
          source: LETTER_DONATION_GIFT_SOURCE,
          contentId: tipRow.id,
        },
      });

      await consumeGemsFifo(input.fanId, input.moco, giftEventRow.id, tx);

      await tx.message.create({
        data: {
          roomId,
          senderId: input.fanId,
          content: buildLetterDonationMessageBody(tipRow.id),
        },
      });
      await tx.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() },
      });

      return { tip: tipRow, giftEvent: giftEventRow };
    });

    const balance = await syncUserGemBalance(input.fanId);

    await notifyTip(input.creatorId, input.fanId, amountCents, creator.username, {
      message,
    });

    return {
      success: true as const,
      tipId: tip.id,
      moco: input.moco,
      giftEventId: giftEvent.id,
      balance,
    };
  } catch (err) {
    if (err instanceof InsufficientGemsBalanceError) {
      return { error: "INSUFFICIENT_MOCO_BALANCE" as const };
    }
    throw err;
  }
}

/** Receiver opens the envelope → credit settlement MOCO (idempotent). */
export async function claimLetterDonationMoco(input: {
  tipId: string;
  viewerId: string;
}) {
  const tip = await db.tip.findUnique({
    where: { id: input.tipId },
    select: {
      id: true,
      amount: true,
      message: true,
      receiverId: true,
      senderId: true,
      sender: { select: { username: true, name: true } },
    },
  });
  if (!tip) return { error: "후원을 찾을 수 없습니다." as const, status: 404 as const };

  if (input.viewerId !== tip.receiverId && input.viewerId !== tip.senderId) {
    return { error: "권한이 없습니다." as const, status: 403 as const };
  }

  const moco = Math.max(0, Math.floor(tip.amount / MOCO_USD_CENTS));
  const tipPayload = {
    id: tip.id,
    amount: tip.amount,
    moco,
    message: tip.message ?? "",
    senderName: tip.sender.name || tip.sender.username,
  };

  if (input.viewerId !== tip.receiverId) {
    return { success: true as const, tip: tipPayload, credited: false, alreadyCredited: false };
  }

  const giftEvent = await db.giftEvent.findFirst({
    where: {
      source: LETTER_DONATION_GIFT_SOURCE,
      contentId: tip.id,
      creatorId: tip.receiverId,
    },
    select: { id: true, gems: true },
  });

  // Legacy Stripe letters — open UI only (settlement already handled at payment time)
  if (!giftEvent) {
    return { success: true as const, tip: tipPayload, credited: false, alreadyCredited: false };
  }

  const existingCredit = await db.platformWalletLedger.findFirst({
    where: {
      referenceType: "letter_donation_open",
      referenceId: tip.id,
      delta: { gt: 0 },
    },
    select: { id: true },
  });
  if (existingCredit) {
    return {
      success: true as const,
      tip: tipPayload,
      credited: false,
      alreadyCredited: true,
      mocoCredited: giftEvent.gems,
    };
  }

  await creditSettlementMoco({
    userId: tip.receiverId,
    amount: giftEvent.gems,
    reason: "편지 후원 개봉 · MOCO 수령",
    referenceType: "letter_donation_open",
    referenceId: tip.id,
    metadata: { giftEventId: giftEvent.id, tipId: tip.id },
  });

  await updateSupportStats(tip.senderId, tip.receiverId, tip.amount);

  return {
    success: true as const,
    tip: tipPayload,
    credited: true,
    alreadyCredited: false,
    mocoCredited: giftEvent.gems,
  };
}
