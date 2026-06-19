"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { StudioAssetCategory } from "@prisma/client";
import { fulfillStudioAssetPurchase } from "@/studio/actions/checkout";

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

/** 테스트·Stripe 미설정 시 즉시 구매 */
export async function purchaseStudioAsset(assetId: string) {
  const user = await requireAuth();
  const asset = await db.studioAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.status !== "PUBLISHED") return { error: "구매할 수 없습니다." };
  if (asset.creatorId === user.id) return { error: "본인 작품은 구매할 수 없습니다." };
  if (asset.isFree || asset.priceKrw <= 0) return { error: "무료 자산입니다." };

  const r = await fulfillStudioAssetPurchase(user.id, assetId, asset.priceKrw);
  if (r.error) return { error: r.error };

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
