import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { isValidUsername } from "@/lib/username-policy";
import { normalizeAtmLetterMessage } from "@/lib/chat-atm-letter";
import { burnPurchasedMocoWithHistory } from "@/lib/moco/transaction-history";
import { deliverPeerTransferLetter } from "@/lib/moco/peer-transfer-letter";
import { creditSettlementMocoInTx } from "@/lib/settlement-moco/economy";
import { getMocoBalanceSnapshot } from "@/lib/auction-deposit/service";
import { joinMoco, mocoCovers, parseSpendableMoco } from "@/lib/moco/decimal-amount";
import { assertCreatorPayoutsEnabled, isCreatorPayoutsEnabled } from "@/lib/creator-payout-ready";

/** 한 번에 전달할 수 있는 구매 MOCO 상한 */
export const MAX_PEER_TRANSFER_MOCO = 1_000_000;

export function parsePeerTransferUsername(raw: string): string | null {
  const username = raw.trim().replace(/^@+/, "");
  if (!isValidUsername(username)) return null;
  return username;
}

export async function lookupPeerTransferRecipient(senderId: string, rawUsername: string) {
  const username = parsePeerTransferUsername(rawUsername);
  if (!username) return { error: "Usernames must be 3–20 characters and use letters, numbers, and _ only." as const };

  const recipient = await db.user.findFirst({
    where: { username: { equals: username, mode: "insensitive" } },
    select: {
      id: true,
      username: true,
      name: true,
      isBanned: true,
      deletedAt: true,
    },
  });
  if (!recipient || recipient.deletedAt || recipient.isBanned) {
    return { error: "No user found with that username." as const };
  }
  if (recipient.id === senderId) {
    return { error: "You cannot send to yourself." as const };
  }
  return {
    recipient: {
      id: recipient.id,
      username: recipient.username,
      name: recipient.name?.trim() || recipient.username,
      payoutsEnabled: await isCreatorPayoutsEnabled(recipient.id),
    },
  };
}

/**
 * 보낸 사람의 보유 MOCO(결제로 충전한 분)만 차감한다.
 * 받는 사람은 정산 MOCO에만 기록되고, 보유 MOCO(gemBalance · mocoPoints)는 변하지 않는다.
 */
export async function transferPurchasedMocoToUser(input: {
  senderId: string;
  senderUsername: string;
  recipientUsername: string;
  amount: number;
  message?: string | null;
}) {
  const { assertMoneyAgeAllowed } = await import("@/lib/money-age-gate");
  const ageBlock = await assertMoneyAgeAllowed(input.senderId);
  if (ageBlock) return { error: ageBlock.error, code: ageBlock.code };

  const amount = parseSpendableMoco(input.amount);
  if (amount == null) {
    return { error: "Send at least 0.1 MOCO, in steps of 0.1." as const };
  }
  input = { ...input, amount };
  if (input.amount > MAX_PEER_TRANSFER_MOCO) {
    return { error: "Amount exceeds the maximum you can send at once." as const };
  }

  const letter = normalizeAtmLetterMessage(input.message);
  if ("error" in letter) return { error: letter.error };

  const lookedUp = await lookupPeerTransferRecipient(input.senderId, input.recipientUsername);
  if ("error" in lookedUp) return lookedUp;
  const recipient = lookedUp.recipient;

  const payout = await assertCreatorPayoutsEnabled(recipient.id);
  if (!payout.ok) return { error: payout.error, code: payout.code };

  const before = await getMocoBalanceSnapshot(input.senderId);
  if (!mocoCovers(before.availableMocoBalance, input.amount)) {
    return { error: "Insufficient MOCO balance. Only MOCO purchased via payment can be sent." as const };
  }

  const referenceId = randomUUID();
  try {
    const result = await db.$transaction(async (tx) => {
      await burnPurchasedMocoWithHistory(tx, {
        userId: input.senderId,
        amountMoco: input.amount,
        type: "PEER_TRANSFER",
        reason: `MOCO transfer · @{v0}${recipient.username}`,
        referenceId,
        metadata: { recipientId: recipient.id, recipientUsername: recipient.username },
      });

      const credited = await creditSettlementMocoInTx(tx, {
        userId: recipient.id,
        amount: input.amount,
        reason: `MOCO received from another user · @{v0}${input.senderUsername}`,
        referenceType: "peer_transfer",
        referenceId,
        metadata: { senderId: input.senderId, senderUsername: input.senderUsername },
      });

      return {
        recipientSettlementAfter: credited
          ? joinMoco(credited.settlementMocoPoints, credited.settlementMocoPointsTenths)
          : input.amount,
      };
    });

    const after = await getMocoBalanceSnapshot(input.senderId);
    try {
      await deliverPeerTransferLetter({
        senderId: input.senderId,
        recipientId: recipient.id,
        amount: input.amount,
        message: letter.message,
      });
    } catch (letterErr) {
      console.error(
        "[deliverPeerTransferLetter]",
        letterErr instanceof Error ? letterErr.name : "error"
      );
    }
    return {
      success: true as const,
      amount: input.amount,
      recipientUsername: recipient.username,
      recipientName: recipient.name,
      senderPurchasedAfter: after.availableMocoBalance,
      recipientSettlementAfter: result.recipientSettlementAfter,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "INSUFFICIENT_MOCO" || message === "INVALID_MOCO_AMOUNT") {
      return { error: "Insufficient MOCO balance. Only MOCO purchased via payment can be sent." as const };
    }
    console.error("[transferPurchasedMocoToUser]", err instanceof Error ? err.name : "error");
    return { error: "Transfer failed. Please try again later." as const };
  }
}
