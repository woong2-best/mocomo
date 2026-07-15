"use server";

import { revalidatePath } from "next/cache";
import type { FlowerGiftContext } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  ensureFlowerCatalogSeeded,
  getFlowerWalletSnapshot,
  giftFlowerAsset,
  newIdempotencyKey,
  requestFlowerRedeem,
} from "@/lib/flower/service";

export async function listFlowerCatalog() {
  await ensureFlowerCatalogSeeded();
  return db.flowerType.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getMyFlowerWallet() {
  const user = await requireAuth({ writeKind: "notification" });
  await ensureFlowerCatalogSeeded();
  return getFlowerWalletSnapshot(user.id);
}

export async function sendFlowerGift(input: {
  assetId: string;
  toUsername: string;
  message?: string;
  useDefaultMessage?: boolean;
  context?: FlowerGiftContext;
  contextId?: string;
  idempotencyKey?: string;
}) {
  const user = await requireAuth();
  const key = input.idempotencyKey?.trim() || newIdempotencyKey("gift");
  try {
    const res = await giftFlowerAsset({
      assetId: input.assetId,
      fromUserId: user.id,
      toUsernameOrId: input.toUsername.trim(),
      message: input.message,
      useDefaultMessage: input.useDefaultMessage,
      context: input.context,
      contextId: input.contextId,
      idempotencyKey: key,
    });
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath("/flowers");
    revalidatePath("/support");
    return { success: true as const, transferId: "transferId" in res ? res.transferId : undefined };
  } catch {
    return { error: "선물 처리에 실패했습니다. 다시 시도해 주세요." };
  }
}

export async function redeemFlowerGift(input: {
  assetId: string;
  idempotencyKey?: string;
}) {
  const user = await requireAuth();
  const key = input.idempotencyKey?.trim() || newIdempotencyKey("redeem");
  try {
    const res = await requestFlowerRedeem({
      assetId: input.assetId,
      userId: user.id,
      idempotencyKey: key,
    });
    if ("error" in res && res.error) return { error: res.error };
    revalidatePath("/flowers");
    return {
      success: true as const,
      redeemId: "redeemId" in res ? res.redeemId : undefined,
      heldForReview: "heldForReview" in res ? res.heldForReview : false,
      netAmountKrw: "netAmountKrw" in res ? res.netAmountKrw : undefined,
    };
  } catch {
    return { error: "환전 요청에 실패했습니다." };
  }
}

export async function getFlowerAssetChain(assetId: string) {
  const user = await requireAuth({ writeKind: "notification" });
  const asset = await db.flowerAsset.findUnique({
    where: { id: assetId },
    include: { flowerType: true },
  });
  if (!asset) return null;
  // Owner or participant in chain can view
  const involved = await db.flowerTransfer.findFirst({
    where: {
      assetId,
      OR: [{ fromUserId: user.id }, { toUserId: user.id }],
    },
  });
  if (asset.ownerId !== user.id && !involved) return null;

  const transfers = await db.flowerTransfer.findMany({
    where: { assetId },
    orderBy: { createdAt: "asc" },
    include: {
      fromUser: { select: { username: true } },
      toUser: { select: { username: true } },
    },
  });
  return { asset, transfers };
}
