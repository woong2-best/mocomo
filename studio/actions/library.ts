"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { grantStudioInventory } from "@/studio/lib/inventory";

export async function getMyStudioLibrary() {
  const user = await requireAuth();
  const rows = await db.studioUserInventory.findMany({
    where: { userId: user.id },
    orderBy: { acquiredAt: "desc" },
    include: {
      asset: {
        include: {
          creator: { select: { id: true, username: true, name: true, image: true } },
        },
      },
    },
  });
  return rows.filter((r) => r.asset.status === "PUBLISHED");
}

export async function acquireFreeStudioAsset(assetId: string) {
  const user = await requireAuth();
  const asset = await db.studioAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.status !== "PUBLISHED") return { error: "획득할 수 없습니다." };
  if (!asset.isFree && asset.priceKrw > 0) return { error: "유료 자산입니다. 구매해 주세요." };
  if (asset.creatorId === user.id) return { error: "본인 작품입니다." };

  const existing = await db.studioUserInventory.findUnique({
    where: { userId_studioAssetId: { userId: user.id, studioAssetId: assetId } },
  });
  if (existing) return { success: true, alreadyOwned: true };

  await grantStudioInventory(user.id, assetId, "FREE");

  revalidatePath("/studio/library");
  revalidatePath(`/studio/market/${assetId}`);
  return { success: true };
}

export async function userHasStudioAsset(userId: string, assetId: string) {
  const owned = await db.studioUserInventory.findUnique({
    where: { userId_studioAssetId: { userId, studioAssetId: assetId } },
  });
  if (owned) return true;

  const purchased = await db.studioAssetPurchase.findUnique({
    where: { buyerId_assetId: { buyerId: userId, assetId } },
  });
  return !!purchased;
}
