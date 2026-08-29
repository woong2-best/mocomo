import { db } from "@/lib/db";
import { isPaidMedia, isMediaUnlockedForViewer } from "@/lib/post-paid-media";

export type MessageAttachmentAccessRow = {
  id: string;
  url: string;
  type: string;
  name?: string | null;
  priceKrw?: number;
  locked?: boolean;
};

export async function getPurchasedMessageAttachmentIds(
  viewerId: string | null | undefined,
  attachmentIds: string[]
) {
  if (!viewerId || attachmentIds.length === 0) return new Set<string>();
  const rows = await db.messageAttachmentPurchase.findMany({
    where: { buyerId: viewerId, attachmentId: { in: attachmentIds } },
    select: { attachmentId: true },
  });
  return new Set(rows.map((r) => r.attachmentId));
}

export function attachMessageMediaAccess<T extends { senderId: string; attachments?: MessageAttachmentAccessRow[] }>(
  message: T,
  viewerId: string | null | undefined,
  purchasedIds: Set<string>
): T {
  if (!message.attachments?.length) return message;
  return {
    ...message,
    attachments: message.attachments.map((a) => {
      const paid = isPaidMedia(a.priceKrw);
      const unlocked = isMediaUnlockedForViewer(
        viewerId,
        message.senderId,
        a.priceKrw,
        purchasedIds.has(a.id)
      );
      const locked = paid && !unlocked;
      return {
        ...a,
        locked,
        url: locked ? "" : a.url,
      };
    }),
  };
}

export function collectPaidAttachmentIds(
  messages: { attachments?: { id: string; priceKrw?: number | null }[] }[]
) {
  const ids: string[] = [];
  for (const m of messages) {
    for (const a of m.attachments ?? []) {
      if (isPaidMedia(a.priceKrw)) ids.push(a.id);
    }
  }
  return ids;
}
