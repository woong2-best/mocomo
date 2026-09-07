import { db } from "@/lib/db";
import { consumeGemsFifo, InsufficientGemsBalanceError } from "@/lib/gems/fifo";
import { syncUserGemBalance } from "@/lib/gems/balance";
import type { GiftEventSource } from "@/lib/gems/constants";

export type SpendGemsInput = {
  fanId: string;
  creatorId: string;
  gems: number;
  source: GiftEventSource;
  contentId?: string;
};

export async function spendGemsOnGift(input: SpendGemsInput) {
  if (input.fanId === input.creatorId) {
    return { error: "자기 자신에게 후원할 수 없습니다." as const };
  }
  if (!Number.isInteger(input.gems) || input.gems <= 0) {
    return { error: "유효하지 않은 젬 수량입니다." as const };
  }

  const creator = await db.user.findUnique({
    where: { id: input.creatorId },
    select: { id: true },
  });
  if (!creator) return { error: "크리에이터를 찾을 수 없습니다." as const };

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

    const balance = await syncUserGemBalance(input.fanId);
    return { success: true as const, giftEvent, balance };
  } catch (err) {
    if (err instanceof InsufficientGemsBalanceError) {
      return { error: "INSUFFICIENT_GEMS_BALANCE" as const };
    }
    throw err;
  }
}
