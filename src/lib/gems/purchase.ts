import { db } from "@/lib/db";
import { PRICE_PER_MOCO_USD, quoteGemTopup } from "@/lib/gems/constants";
import { syncUserGemBalance } from "@/lib/gems/balance";

export async function fulfillGemTopup(input: {
  fanId: string;
  paymentIntentDbId: string;
  stripePaymentIntentId: string;
  amountUsdCents: number;
  gemsFromMeta?: number;
}) {
  const gems = input.gemsFromMeta;
  if (gems == null) {
    return { error: "MOCO 충전량을 확인할 수 없습니다." as const };
  }

  const quote = quoteGemTopup(gems);
  if (!quote.ok) {
    return { error: quote.error as const };
  }
  if (quote.usdCents !== input.amountUsdCents) {
    return { error: "충전 금액이 일치하지 않습니다." as const };
  }

  const existing = await db.gemPurchase.findUnique({
    where: { stripePaymentIntentId: input.stripePaymentIntentId },
  });
  if (existing) {
    await syncUserGemBalance(input.fanId);
    return { success: true as const, alreadyFulfilled: true, gems: existing.gems };
  }

  const krwAmount = Math.round((input.amountUsdCents / 100) * 1300);

  await db.gemPurchase.create({
    data: {
      fanId: input.fanId,
      krwAmount,
      gems: quote.moco,
      remainingGems: quote.moco,
      pricePerGemUsd: PRICE_PER_MOCO_USD,
      stripePaymentIntentId: input.stripePaymentIntentId,
    },
  });

  const balance = await syncUserGemBalance(input.fanId);
  return { success: true as const, gems: quote.moco, balance };
}
