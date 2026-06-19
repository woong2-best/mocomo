"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import type { StudioAssetCategory } from "@prisma/client";
import { validateUploadMeta } from "@/studio/lib/validation";
import { publishStudioAsset } from "@/studio/lib/publish";
import { grantStudioInventory } from "@/studio/lib/inventory";

function revalidateStudio() {
  revalidatePath("/studio");
  revalidatePath("/studio/assets");
  revalidatePath("/studio/market");
}

export async function createStudioAsset(data: {
  name: string;
  description?: string;
  category: StudioAssetCategory;
  tags?: string[];
  isFree?: boolean;
  priceKrw?: number;
}) {
  const user = await requireAuth();
  const name = data.name.trim();
  if (!name) return { error: "이름을 입력해 주세요." };

  const asset = await db.studioAsset.create({
    data: {
      creatorId: user.id,
      name,
      description: data.description?.trim() || null,
      category: data.category,
      tags: data.tags ?? [],
      isFree: data.isFree ?? true,
      priceKrw: data.isFree ? 0 : Math.max(0, data.priceKrw ?? 0),
    },
  });

  revalidateStudio();
  return { assetId: asset.id };
}

export async function updateStudioAsset(
  assetId: string,
  data: {
    name?: string;
    description?: string;
    category?: StudioAssetCategory;
    tags?: string[];
    isFree?: boolean;
    priceKrw?: number;
    thumbnailUrl?: string;
  }
) {
  const user = await requireAuth();
  const asset = await db.studioAsset.findFirst({
    where: { id: assetId, creatorId: user.id },
  });
  if (!asset) return { error: "자산을 찾을 수 없습니다." };
  if (asset.status !== "DRAFT" && asset.status !== "REJECTED") {
    return { error: "초안 또는 반려 상태에서만 수정할 수 있습니다." };
  }

  await db.studioAsset.update({
    where: { id: assetId },
    data: {
      name: data.name?.trim() ?? asset.name,
      description: data.description !== undefined ? data.description.trim() || null : asset.description,
      category: data.category ?? asset.category,
      tags: data.tags ?? asset.tags,
      isFree: data.isFree ?? asset.isFree,
      priceKrw: data.isFree ? 0 : Math.max(0, data.priceKrw ?? asset.priceKrw),
      thumbnailUrl: data.thumbnailUrl ?? asset.thumbnailUrl,
      status: asset.status === "REJECTED" ? "DRAFT" : asset.status,
      rejectReason: asset.status === "REJECTED" ? null : asset.rejectReason,
    },
  });

  revalidateStudio();
  revalidatePath(`/studio/assets/${assetId}`);
  return { success: true };
}

export async function attachStudioAssetFile(
  assetId: string,
  data: {
    glbUrl: string;
    fileSizeBytes: number;
    polygonCount?: number;
    textureMaxSize?: number;
    filename: string;
  }
) {
  const user = await requireAuth();
  const asset = await db.studioAsset.findFirst({
    where: { id: assetId, creatorId: user.id },
  });
  if (!asset) return { error: "자산을 찾을 수 없습니다." };
  if (asset.status !== "DRAFT" && asset.status !== "REJECTED") {
    return { error: "초안 상태에서만 파일을 교체할 수 있습니다." };
  }

  const validation = validateUploadMeta({
    filename: data.filename,
    fileSizeBytes: data.fileSizeBytes,
    polygonCount: data.polygonCount,
    textureMaxSize: data.textureMaxSize,
  });

  if (!validation.ok) {
    return { error: validation.issues.find((i) => i.severity === "error")?.message ?? "검증 실패" };
  }

  await db.studioAsset.update({
    where: { id: assetId },
    data: {
      glbUrl: data.glbUrl,
      fileSizeBytes: data.fileSizeBytes,
      polygonCount: data.polygonCount ?? null,
      textureMaxSize: data.textureMaxSize ?? null,
      validationLog: validation.issues,
    },
  });

  revalidatePath(`/studio/assets/${assetId}`);
  return { success: true, validation };
}

export async function submitStudioAssetForReview(assetId: string) {
  const user = await requireAuth();
  const asset = await db.studioAsset.findFirst({
    where: { id: assetId, creatorId: user.id },
  });
  if (!asset) return { error: "자산을 찾을 수 없습니다." };
  if (!asset.glbUrl) return { error: "3D 파일을 먼저 업로드해 주세요." };
  if (asset.status !== "DRAFT" && asset.status !== "REJECTED") {
    return { error: "제출할 수 없는 상태입니다." };
  }

  const issues = (asset.validationLog as { severity: string }[] | null) ?? [];
  if (issues.some((i) => i.severity === "error")) {
    return { error: "검증 오류를 해결한 뒤 제출해 주세요." };
  }

  await db.studioAsset.update({
    where: { id: assetId },
    data: {
      status: "REVIEWING",
      submittedAt: new Date(),
      rejectReason: null,
    },
  });

  revalidateStudio();
  revalidatePath(`/studio/assets/${assetId}`);
  return { success: true };
}

export async function capturePreviewThumbnail(assetId: string, thumbnailUrl: string) {
  const user = await requireAuth();
  const asset = await db.studioAsset.findFirst({
    where: { id: assetId, creatorId: user.id },
  });
  if (!asset) return { error: "자산을 찾을 수 없습니다." };
  if (asset.status !== "DRAFT" && asset.status !== "REJECTED") {
    return { error: "초안 상태에서만 썸네일을 변경할 수 있습니다." };
  }

  await db.studioAsset.update({
    where: { id: assetId },
    data: { thumbnailUrl },
  });

  revalidatePath(`/studio/assets/${assetId}`);
  return { success: true };
}

export async function deleteStudioAsset(assetId: string) {
  const user = await requireAuth();
  const asset = await db.studioAsset.findFirst({
    where: { id: assetId, creatorId: user.id },
  });
  if (!asset) return { error: "자산을 찾을 수 없습니다." };
  if (asset.status === "PUBLISHED") return { error: "배포된 자산은 삭제할 수 없습니다." };

  await db.studioAsset.delete({ where: { id: assetId } });
  revalidateStudio();
  return { success: true };
}

export async function getMyStudioAssets() {
  const user = await requireAuth();
  return db.studioAsset.findMany({
    where: { creatorId: user.id },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getStudioAsset(assetId: string) {
  return db.studioAsset.findUnique({
    where: { id: assetId },
    include: {
      creator: { select: { id: true, username: true, name: true, image: true } },
    },
  });
}

export async function publishApprovedAsset(assetId: string) {
  const user = await requireAuth();
  const asset = await db.studioAsset.findFirst({
    where: { id: assetId, creatorId: user.id },
  });
  if (!asset) return { error: "자산을 찾을 수 없습니다." };
  if (asset.status !== "APPROVED") return { error: "승인된 자산만 배포할 수 있습니다." };

  try {
    await publishStudioAsset(assetId);
    revalidateStudio();
    revalidatePath(`/studio/assets/${assetId}`);
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "배포 실패" };
  }
}

export async function downloadStudioAsset(assetId: string) {
  const user = await requireAuth();
  const asset = await db.studioAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.status !== "PUBLISHED" || !asset.glbUrl) {
    return { error: "다운로드할 수 없습니다." };
  }

  const isOwner = asset.creatorId === user.id;
  if (!isOwner && !asset.isFree) {
    const owned = await db.studioUserInventory.findUnique({
      where: { userId_studioAssetId: { userId: user.id, studioAssetId: assetId } },
    });
    const purchased = await db.studioAssetPurchase.findUnique({
      where: { buyerId_assetId: { buyerId: user.id, assetId } },
    });
    if (!owned && !purchased) return { error: "구매 또는 무료 획득 후 다운로드할 수 있습니다." };
  }

  if (!isOwner && asset.isFree) {
    await grantStudioInventory(user.id, assetId, "FREE");
  }

  await db.$transaction([
    db.studioAsset.update({
      where: { id: assetId },
      data: { downloadCount: { increment: 1 } },
    }),
    db.studioCreatorProfile.updateMany({
      where: { userId: asset.creatorId },
      data: { totalDownloads: { increment: 1 } },
    }),
  ]);

  return { url: asset.glbUrl };
}
