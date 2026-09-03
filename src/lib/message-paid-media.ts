import type { MessageAttachmentType } from "@prisma/client";
import { db } from "@/lib/db";
import { isPaidMedia, isMediaUnlockedForViewer } from "@/lib/post-paid-media";
import { paidMessageAttachmentPlaybackPath } from "@/lib/paid-media-playback";
import { isForensicMessageAttachmentType } from "@/lib/chat-attachments";

export type MessageAttachmentAccessRow = {
  id: string;
  url: string;
  type: MessageAttachmentType;
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
      if (locked) return { ...a, locked, url: "" };
      // Unlocked paid media streams through the entitlement gate so the origin
      // URL never reaches the client and the forensic canvas can read pixels
      // same-origin.
      if (paid && isForensicMessageAttachmentType(a.type)) {
        return { ...a, locked, url: paidMessageAttachmentPlaybackPath(a.id) };
      }
      return { ...a, locked, url: a.url };
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
