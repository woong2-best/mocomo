"use server";

import { revalidatePath } from "next/cache";
import { revalidateAptHub } from "@/lib/apt/revalidate-hub";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isPaymentsConfigured } from "@/lib/payments";
import { createStripeCheckout } from "@/actions/monetization";
import { STUDIO_PLATFORM_FEE_PERCENT } from "@/studio/lib/constants";

/** Stripe ê²°ì œ ?„ë£Œ ???¸ì¶œ (payment-fulfillment) */
export async function fulfillStudioAssetPurchase(userId: string, assetId: string, amountKrw: number) {
  const asset = await db.studioAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.status !== "PUBLISHED") return { error: "?ì‚°??ì°¾ì„ ???†ìŠµ?ˆë‹¤." };

  const existing = await db.studioAssetPurchase.findUnique({
    where: { buyerId_assetId: { buyerId: userId, assetId } },
  });
  if (existing) return { success: true, alreadyOwned: true, platformFee: 0, creatorEarn: 0 };

  const platformFee = Math.floor((amountKrw * STUDIO_PLATFORM_FEE_PERCENT) / 100);
  const creatorEarn = amountKrw - platformFee;

  await db.$transaction(async (tx) => {
    await tx.studioAssetPurchase.create({
      data: { buyerId: userId, assetId, priceKrw: amountKrw, platformFee, creatorEarn },
    });
    await tx.studioAsset.update({ where: { id: assetId }, data: { saleCount: { increment: 1 } } });

    const wallet = await tx.studioWallet.upsert({
      where: { userId: asset.creatorId },
      create: { userId: asset.creatorId, availableBalance: creatorEarn, totalEarned: creatorEarn },
      update: { availableBalance: { increment: creatorEarn }, totalEarned: { increment: creatorEarn } },
    });

    await tx.studioWalletTransaction.create({
      data: {
        userId: asset.creatorId,
        type: "SALE",
        amount: creatorEarn,
        balanceAfter: wallet.availableBalance,
        referenceType: "StudioAssetPurchase",
        referenceId: assetId,
        memo: asset.name,
      },
    });

    await tx.studioCreatorProfile.updateMany({
      where: { userId: asset.creatorId },
      data: { totalSales: { increment: 1 } },
    });

    await tx.studioUserInventory.upsert({
      where: { userId_studioAssetId: { userId, studioAssetId: assetId } },
      create: { userId, studioAssetId: assetId, source: "PURCHASE" },
      update: {},
    });
  });

  revalidatePath("/studio/market");
  revalidatePath(`/studio/market/${assetId}`);
  revalidatePath("/studio/library");
  revalidateAptHub();
  return { success: true, alreadyOwned: false, creatorId: asset.creatorId, creatorEarn, platformFee };
}

export async function createStudioAssetCheckout(assetId: string) {
  const user = await requireAuth();
  if (!isPaymentsConfigured()) {
    return { error: "Stripe ê²°ì œê°€ ?¤ì •?˜ì? ?Šì•˜?µë‹ˆ?? ?ŒìŠ¤??êµ¬ë§¤??ì¦‰ì‹œ êµ¬ë§¤ë¥??¬ìš©?˜ì„¸??" };
  }

  const asset = await db.studioAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.status !== "PUBLISHED") return { error: "êµ¬ë§¤?????†ìŠµ?ˆë‹¤." };
  if (asset.creatorId === user.id) return { error: "ë³¸ì¸ ?‘í’ˆ?…ë‹ˆ??" };
  if (asset.isFree || asset.priceKrw <= 0) return { error: "ë¬´ë£Œ ?ì‚°?…ë‹ˆ??" };

  const owned = await db.studioUserInventory.findUnique({
    where: { userId_studioAssetId: { userId: user.id, studioAssetId: assetId } },
  });
  if (owned) return { error: "?´ë? ë³´ìœ  ì¤‘ì…?ˆë‹¤." };

  return createStripeCheckout({
    type: "STUDIO_ASSET",
    amount: asset.priceKrw,
    orderName: `[Studio] ${asset.name}`,
    metadata: { studioAssetId: assetId, assetName: asset.name },
  });
}
