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
  if (!attachment) return { error: "actions.sbz5e1p" };
  if (!isPaidMedia(attachment.priceKrw)) {
    return { error: "actions.s1q0ka3" };
  }
  if (attachment.message.senderId === buyerId) {
    return { error: "actions.s1i85y9b" };
  }
  if (attachment.priceKrw !== amount) {
    return { error: "actions.s5c55hc" };
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
