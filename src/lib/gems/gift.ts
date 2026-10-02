import { db } from "@/lib/db";
import { consumeGemsFifo, InsufficientGemsBalanceError } from "@/lib/gems/fifo";
import { syncUserGemBalance } from "@/lib/gems/balance";
import type { GiftEventSource } from "@/lib/gems/constants";
import { creditSettlementMoco } from "@/lib/settlement-moco/economy";
import { assertCreatorPayoutsEnabled } from "@/lib/creator-payout-ready";

export type SpendGemsInput = {
  fanId: string;
  creatorId: string;
  gems: number;
  source: GiftEventSource;
  contentId?: string;
};

export async function spendGemsOnGift(input: SpendGemsInput) {
  if (input.fanId === input.creatorId) {
    return { error: "You cannot tip yourself." as const };
  }
  if (!Number.isInteger(input.gems) || input.gems <= 0) {
    return { error: "Invalid MOCO amount." as const };
  }

  const creator = await db.user.findUnique({
    where: { id: input.creatorId },
    select: { id: true },
  });
  if (!creator) return { error: "Creator not found." as const };

  const payout = await assertCreatorPayoutsEnabled(input.creatorId);
  if (!payout.ok) return { error: payout.error, code: payout.code };

  try {
    const giftEvent = await db.$transaction(async (tx) => {
      const event = await tx.giftEvent.create({
        data: {
          fanId: input.fanId,
          creatorId: input.creatorId,
          gems: input.gems,
          source: input.source,
          contentId: input.contentId ?? null,
        },
      });

      await consumeGemsFifo(input.fanId, input.gems, event.id, tx);
      return event;
    });

    await creditSettlementMoco({
      userId: input.creatorId,
      amount: input.gems,
      reason: "MOCO tip · paid media (purchased→earned)",
      referenceType: "gift_event",
      referenceId: giftEvent.id,
      metadata: { source: input.source, gems: input.gems },
    });

    const balance = await syncUserGemBalance(input.fanId);
    return { success: true as const, giftEvent, balance };
  } catch (err) {
    if (err instanceof InsufficientGemsBalanceError) {
      return { error: "INSUFFICIENT_MOCO_BALANCE" as const };
    }
    throw err;
  }
}
