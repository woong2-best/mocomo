"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { StudioAssetCategory } from "@prisma/client";
import { STUDIO_PLATFORM_FEE_PERCENT } from "@/studio/lib/constants";

export async function listPublishedAssets(opts?: {
  category?: StudioAssetCategory;
  q?: string;
  take?: number;
}) {
  const where = {
    status: "PUBLISHED" as const,
    ...(opts?.category ? { category: opts.category } : {}),
    ...(opts?.q
      ? {
          OR: [
            { name: { contains: opts.q, mode: "insensitive" as const } },
            { tags: { has: opts.q.toLowerCase() } },
          ],
        }
      : {}),
  };

  return db.studioAsset.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take: opts?.take ?? 48,
    include: {
      creator: { select: { id: true, username: true, name: true, image: true } },
    },
  });
}

export async function purchaseStudioAsset(assetId: string) {
  const user = await requireAuth();
  const asset = await db.studioAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.status !== "PUBLISHED") return { error: "구매할 수 없습니다." };
  if (asset.creatorId === user.id) return { error: "본인 작품은 구매할 수 없습니다." };
  if (asset.isFree || asset.priceKrw <= 0) return { error: "무료 자산입니다." };

  const existing = await db.studioAssetPurchase.findUnique({
    where: { buyerId_assetId: { buyerId: user.id, assetId } },
  });
  if (existing) return { error: "이미 구매한 자산입니다." };

  const platformFee = Math.floor((asset.priceKrw * STUDIO_PLATFORM_FEE_PERCENT) / 100);
  const creatorEarn = asset.priceKrw - platformFee;

  await db.$transaction(async (tx) => {
    await tx.studioAssetPurchase.create({
      data: {
        buyerId: user.id,
        assetId,
        priceKrw: asset.priceKrw,
        platformFee,
        creatorEarn,
      },
    });

    await tx.studioAsset.update({
      where: { id: assetId },
      data: { saleCount: { increment: 1 } },
    });

    const wallet = await tx.studioWallet.upsert({
      where: { userId: asset.creatorId },
      create: {
        userId: asset.creatorId,
        availableBalance: creatorEarn,
        totalEarned: creatorEarn,
      },
      update: {
        availableBalance: { increment: creatorEarn },
        totalEarned: { increment: creatorEarn },
      },
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
  });

  revalidatePath("/studio/market");
  revalidatePath(`/studio/market/${assetId}`);
  revalidatePath("/studio/wallet");
  return { success: true };
}

export async function toggleStudioAssetLike(assetId: string) {
  const user = await requireAuth();
  const asset = await db.studioAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.status !== "PUBLISHED") return { error: "좋아요할 수 없습니다." };

  const existing = await db.studioAssetLike.findUnique({
    where: { userId_assetId: { userId: user.id, assetId } },
  });

  if (existing) {
    await db.$transaction([
      db.studioAssetLike.delete({ where: { id: existing.id } }),
      db.studioAsset.update({ where: { id: assetId }, data: { likeCount: { decrement: 1 } } }),
      db.studioCreatorProfile.updateMany({
        where: { userId: asset.creatorId },
        data: { totalLikes: { decrement: 1 } },
      }),
    ]);
    return { liked: false };
  }

  await db.$transaction([
    db.studioAssetLike.create({ data: { userId: user.id, assetId } }),
    db.studioAsset.update({ where: { id: assetId }, data: { likeCount: { increment: 1 } } }),
    db.studioCreatorProfile.updateMany({
      where: { userId: asset.creatorId },
      data: { totalLikes: { increment: 1 } },
    }),
  ]);

  return { liked: true };
}
