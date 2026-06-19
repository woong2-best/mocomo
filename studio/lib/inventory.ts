import { db } from "@/lib/db";

export async function grantStudioInventory(
  userId: string,
  studioAssetId: string,
  source: "FREE" | "PURCHASE" | "MOCOMO_INAPP"
) {
  return db.studioUserInventory.upsert({
    where: { userId_studioAssetId: { userId, studioAssetId } },
    create: { userId, studioAssetId, source },
    update: {},
  });
}

export async function userOwnsStudioAsset(userId: string, studioAssetId: string) {
  const row = await db.studioUserInventory.findUnique({
    where: { userId_studioAssetId: { userId, studioAssetId } },
  });
  return !!row;
}
