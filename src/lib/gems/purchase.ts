import { db } from "@/lib/db";
import { PRICE_PER_GEM_USD, findGemTopupPackage } from "@/lib/gems/constants";
import { syncUserGemBalance } from "@/lib/gems/balance";

export async function fulfillGemTopup(input: {
  fanId: string;
  paymentIntentDbId: string;
  stripePaymentIntentId: string;
  amountUsdCents: number;
  gemsFromMeta?: number;
}) {
  const pack = input.gemsFromMeta != null ? findGemTopupPackage(input.gemsFromMeta) : null;
  const gems = pack?.gems ?? input.gemsFromMeta;
  if (!gems || gems <= 0) {
    return { error: "젬 충전량을 확인할 수 없습니다." as const };
  }
  if (pack && pack.usdCents !== input.amountUsdCents) {
    return { error: "젬 충전 금액이 패키지와 일치하지 않습니다." as const };
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
      gems,
      remainingGems: gems,
      pricePerGemUsd: PRICE_PER_GEM_USD,
      stripePaymentIntentId: input.stripePaymentIntentId,
    },
  });

  const balance = await syncUserGemBalance(input.fanId);
  return { success: true as const, gems, balance };
}
