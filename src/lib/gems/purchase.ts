import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { PRICE_PER_MOCO_USD, quoteGemTopup } from "@/lib/gems/constants";
import { syncUserGemBalance } from "@/lib/gems/balance";
import { recordMocoTopupTransaction } from "@/lib/moco/topup-ledger";
import { registerContributionTowerBlock } from "@/lib/contribution-tower/service";

export async function fulfillGemTopup(input: {
  fanId: string;
  paymentIntentDbId: string;
  stripePaymentIntentId: string;
  amountUsdCents: number;
  gemsFromMeta?: number;
}) {
  const gems = input.gemsFromMeta;
  if (gems == null) {
    return { error: "Could not verify MOCO top-up amount." as const };
  }

  const quote = quoteGemTopup(gems);
  if (!quote.ok) {
    return { error: quote.error };
  }
  if (quote.usdCents !== input.amountUsdCents) {
    return { error: "Top-up amount does not match." as const };
  }

  const existing = await db.gemPurchase.findUnique({
    where: { stripePaymentIntentId: input.stripePaymentIntentId },
  });
  if (existing) {
    await db.$transaction(async (tx) => {
      await registerContributionTowerBlock(tx, {
        userId: input.fanId,
        gemPurchaseId: existing.id,
        stripePaymentIntentId: input.stripePaymentIntentId,
        mocoQuantity: existing.gems,
      });
    });
    await syncUserGemBalance(input.fanId);
    revalidatePath("/contribution-tower");
    return { success: true as const, alreadyFulfilled: true, gems: existing.gems };
  }

  const krwAmount = Math.round((input.amountUsdCents / 100) * 1300);

  await db.$transaction(async (tx) => {
    const purchase = await tx.gemPurchase.create({
      data: {
        fanId: input.fanId,
        krwAmount,
        gems: quote.moco,
        remainingGems: quote.moco,
        pricePerGemUsd: PRICE_PER_MOCO_USD,
        stripePaymentIntentId: input.stripePaymentIntentId,
      },
    });
    await recordMocoTopupTransaction(tx, {
      userId: input.fanId,
      mocoQuantity: quote.moco,
      paymentIntentId: input.paymentIntentDbId,
      stripePaymentRef: input.stripePaymentIntentId,
      grossAmountCents: input.amountUsdCents,
    });
    await registerContributionTowerBlock(tx, {
      userId: input.fanId,
      gemPurchaseId: purchase.id,
      stripePaymentIntentId: input.stripePaymentIntentId,
      mocoQuantity: quote.moco,
    });
  });

  revalidatePath("/contribution-tower");

  const balance = await syncUserGemBalance(input.fanId);
  return { success: true as const, gems: quote.moco, balance };
}
