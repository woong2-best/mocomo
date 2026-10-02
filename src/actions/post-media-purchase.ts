"use server";

import { db } from "@/lib/db";
import { splitPlatformFee } from "@/lib/settlement";

export async function fulfillPostMediaPurchase(
  buyerId: string,
  mediaId: string,
  amount: number,
  paymentIntentId: string
) {
  const media = await db.postMedia.findUnique({
    where: { id: mediaId },
    include: {
      post: {
        select: { authorId: true, instantPurchasePriceKrw: true, id: true },
      },
    },
  });
  if (!media) return { error: "actions.sbz5e1p" };
  if (media.post.authorId === buyerId) return { error: "actions.s1i85y9b" };

  const isInstantUnlock =
    media.post.instantPurchasePriceKrw > 0 &&
    amount === media.post.instantPurchasePriceKrw &&
    amount !== media.priceKrw;

  if (!isInstantUnlock) {
    if (media.priceKrw <= 0 && media.post.instantPurchasePriceKrw !== amount) {
      return { error: "actions.s1siyy5j" };
    }
    if (media.priceKrw > 0 && media.priceKrw !== amount && media.post.instantPurchasePriceKrw !== amount) {
      return { error: "actions.s5c55hc" };
    }
  }

  const existing = await db.postMediaPurchase.findUnique({
    where: { buyerId_mediaId: { buyerId, mediaId } },
  });
  if (existing) return { success: true as const, alreadyOwned: true as const };

  const mediaIds = isInstantUnlock
    ? (
        await db.postMedia.findMany({
          where: { postId: media.postId },
          select: { id: true },
        })
      ).map((m) => m.id)
    : [mediaId];

  for (const id of mediaIds) {
    const prior = await db.postMediaPurchase.findUnique({
      where: { buyerId_mediaId: { buyerId, mediaId: id } },
    });
    if (prior) continue;
    await db.postMediaPurchase.create({
      data: { buyerId, mediaId: id, price: amount },
    });
    await db.postMedia.update({
      where: { id },
      data: { purchaseCount: { increment: 1 } },
    });
  }

  const { platformFee, sellerAmount } = splitPlatformFee(amount);
  return {
    success: true as const,
    authorId: media.post.authorId,
    platformFee,
    sellerAmount,
    referenceId: mediaId,
    paymentIntentId,
    postId: media.postId,
  };
}
