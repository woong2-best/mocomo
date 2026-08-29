"use server";

import { db } from "@/lib/db";
import { splitPlatformFee } from "@/lib/settlement";
import { isPaidMedia } from "@/lib/post-paid-media";

export async function fulfillMessageMediaPurchase(
  buyerId: string,
  attachmentId: string,
  amount: number,
  paymentIntentId: string
) {
  const attachment = await db.messageAttachment.findUnique({
    where: { id: attachmentId },
    include: {
      message: {
        select: { senderId: true, roomId: true },
      },
    },
  });
  if (!attachment) return { error: "미디어를 찾을 수 없습니다." };
  if (!isPaidMedia(attachment.priceKrw)) {
    return { error: "구매가 필요 없는 미디어입니다." };
  }
  if (attachment.message.senderId === buyerId) {
    return { error: "본인 콘텐츠는 구매할 수 없습니다." };
  }
  if (attachment.priceKrw !== amount) {
    return { error: "가격이 일치하지 않습니다." };
  }

  const existing = await db.messageAttachmentPurchase.findUnique({
    where: { buyerId_attachmentId: { buyerId, attachmentId } },
  });
  if (existing) return { success: true as const, alreadyOwned: true as const };

  await db.messageAttachmentPurchase.create({
    data: { buyerId, attachmentId, price: amount },
  });
  await db.messageAttachment.update({
    where: { id: attachmentId },
    data: { purchaseCount: { increment: 1 } },
  });

  const { platformFee, sellerAmount } = splitPlatformFee(amount);
  return {
    success: true as const,
    authorId: attachment.message.senderId,
    platformFee,
    sellerAmount,
    referenceId: attachmentId,
    paymentIntentId,
    roomId: attachment.message.roomId,
  };
}
