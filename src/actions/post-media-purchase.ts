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
    include: { post: { select: { authorId: true } } },
  });
  if (!media) return { error: "미디어를 찾을 수 없습니다." };
  if (media.priceKrw <= 0) return { error: "무료 미디어는 구매가 필요 없습니다." };
  if (media.priceKrw !== amount) return { error: "가격이 일치하지 않습니다." };
  if (media.post.authorId === buyerId) return { error: "본인 콘텐츠는 구매할 수 없습니다." };

  const existing = await db.postMediaPurchase.findUnique({
    where: { buyerId_mediaId: { buyerId, mediaId } },
  });
  if (existing) return { success: true as const, alreadyOwned: true as const };

  await db.postMediaPurchase.create({
    data: { buyerId, mediaId, price: amount },
  });
  await db.postMedia.update({
    where: { id: mediaId },
    data: { purchaseCount: { increment: 1 } },
  });

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
