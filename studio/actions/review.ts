"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { isOperatorIdentity } from "@/lib/operator-config";
import { publishStudioAsset } from "@/studio/lib/publish";

async function requireStudioReviewer() {
  const user = await requireAuth();
  if (
    !isOperatorIdentity({ username: user.username ?? "", role: user.role ?? "USER" })
  ) {
    throw new Error("권한이 없습니다");
  }
  return user;
}

export async function getReviewQueue() {
  await requireStudioReviewer();
  return db.studioAsset.findMany({
    where: { status: { in: ["SUBMITTED", "REVIEWING"] } },
    orderBy: { submittedAt: "asc" },
    include: {
      creator: { select: { id: true, username: true, name: true, image: true } },
    },
  });
}

export async function startReview(assetId: string) {
  await requireStudioReviewer();
  await db.studioAsset.updateMany({
    where: { id: assetId, status: "SUBMITTED" },
    data: { status: "REVIEWING" },
  });
  revalidatePath("/studio/admin/review");
  return { success: true };
}

export async function approveStudioAsset(assetId: string) {
  await requireStudioReviewer();
  await db.studioAsset.update({
    where: { id: assetId },
    data: { status: "APPROVED", reviewedAt: new Date(), rejectReason: null },
  });
  revalidatePath("/studio/admin/review");
  revalidatePath(`/studio/assets/${assetId}`);
  return { success: true };
}

export async function rejectStudioAsset(assetId: string, reason: string) {
  await requireStudioReviewer();
  const trimmed = reason.trim();
  if (!trimmed) return { error: "반려 사유를 입력해 주세요." };

  await db.studioAsset.update({
    where: { id: assetId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      rejectReason: trimmed,
    },
  });
  revalidatePath("/studio/admin/review");
  revalidatePath(`/studio/assets/${assetId}`);
  return { success: true };
}

export async function approveAndPublishStudioAsset(assetId: string) {
  await requireStudioReviewer();
  await db.studioAsset.update({
    where: { id: assetId },
    data: { status: "APPROVED", reviewedAt: new Date(), rejectReason: null },
  });
  await publishStudioAsset(assetId);
  revalidatePath("/studio/admin/review");
  revalidatePath("/studio/market");
  return { success: true };
}
