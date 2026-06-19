import { db } from "@/lib/db";
import type { StudioAsset } from "@prisma/client";

/** 승인된 자산을 Published + MoCoMo 카탈로그에 등록 */
export async function publishStudioAsset(assetId: string): Promise<StudioAsset> {
  const asset = await db.studioAsset.findUniqueOrThrow({ where: { id: assetId } });

  if (!asset.glbUrl) {
    throw new Error("GLB URL이 없습니다");
  }
  if (asset.status !== "APPROVED" && asset.status !== "REVIEWING") {
    throw new Error("승인된 자산만 배포할 수 있습니다");
  }

  const now = new Date();

  const published = await db.$transaction(async (tx) => {
    const updated = await tx.studioAsset.update({
      where: { id: assetId },
      data: {
        status: "PUBLISHED",
        publishedAt: now,
      },
    });

    await tx.mocomoStudioCatalogItem.upsert({
      where: { studioAssetId: assetId },
      create: {
        studioAssetId: assetId,
        category: updated.category,
        name: updated.name,
        glbUrl: updated.glbUrl!,
        thumbnailUrl: updated.thumbnailUrl,
        tags: updated.tags,
        creatorId: updated.creatorId,
        priceKrw: updated.isFree ? 0 : updated.priceKrw,
        publishedAt: now,
      },
      update: {
        category: updated.category,
        name: updated.name,
        glbUrl: updated.glbUrl!,
        thumbnailUrl: updated.thumbnailUrl,
        tags: updated.tags,
        priceKrw: updated.isFree ? 0 : updated.priceKrw,
        publishedAt: now,
      },
    });

    return updated;
  });

  return published;
}
