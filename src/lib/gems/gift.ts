import { db } from "@/lib/db";
import { consumeGemsFifo, InsufficientGemsBalanceError } from "@/lib/gems/fifo";
import { syncUserGemBalance } from "@/lib/gems/balance";
import type { GiftEventSource } from "@/lib/gems/constants";
import { creditSettlementMoco } from "@/lib/settlement-moco/economy";
import { assertCreatorPayoutsEnabled } from "@/lib/creator-payout-ready";
import { mocoToTenths, parseSpendableMoco, splitUnsignedTenths } from "@/lib/moco/decimal-amount";

export type SpendGemsInput = {
  fanId: string;
  creatorId: string;
  gems: number;
  source: GiftEventSource;
  contentId?: string;
};

export async function spendGemsOnGift(input: SpendGemsInput) {
  const { assertMoneyAgeAllowed } = await import("@/lib/money-age-gate");
  const ageBlock = await assertMoneyAgeAllowed(input.fanId);
  if (ageBlock) return { error: ageBlock.error, code: ageBlock.code };

  if (input.fanId === input.creatorId) {
    return { error: "You cannot tip yourself." as const };
  }
  const gems = parseSpendableMoco(input.gems);
  if (gems == null) {
    return { error: "Invalid MOCO amount." as const };
  }
  const parts = splitUnsignedTenths(mocoToTenths(gems)!);

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
          gems: parts.whole,
          gemsTenths: parts.tenths,
          source: input.source,
          contentId: input.contentId ?? null,
        },
      });

      await consumeGemsFifo(input.fanId, gems, event.id, tx);
      return event;
    });

    await creditSettlementMoco({
      userId: input.creatorId,
      amount: gems,
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
