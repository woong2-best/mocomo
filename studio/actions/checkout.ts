"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isPaymentsConfigured } from "@/lib/payments";
import { createStripeCheckout } from "@/actions/monetization";
import { STUDIO_PLATFORM_FEE_PERCENT } from "@/studio/lib/constants";

/** Stripe 결제 완료 후 호출 (payment-fulfillment) */
export async function fulfillStudioAssetPurchase(userId: string, assetId: string, amountKrw: number) {
  const asset = await db.studioAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.status !== "PUBLISHED") return { error: "자산을 찾을 수 없습니다." };

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
  revalidatePath("/apt");
  return { success: true, alreadyOwned: false, creatorId: asset.creatorId, creatorEarn, platformFee };
}

export async function createStudioAssetCheckout(assetId: string) {
  const user = await requireAuth();
  if (!isPaymentsConfigured()) {
    return { error: "Stripe 결제가 설정되지 않았습니다. 테스트 구매는 즉시 구매를 사용하세요." };
  }

  const asset = await db.studioAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.status !== "PUBLISHED") return { error: "구매할 수 없습니다." };
  if (asset.creatorId === user.id) return { error: "본인 작품입니다." };
  if (asset.isFree || asset.priceKrw <= 0) return { error: "무료 자산입니다." };

  const owned = await db.studioUserInventory.findUnique({
    where: { userId_studioAssetId: { userId: user.id, studioAssetId: assetId } },
  });
  if (owned) return { error: "이미 보유 중입니다." };

  return createStripeCheckout({
    type: "STUDIO_ASSET",
    amount: asset.priceKrw,
    orderName: `[Studio] ${asset.name}`,
    metadata: { studioAssetId: assetId, assetName: asset.name },
  });
}
