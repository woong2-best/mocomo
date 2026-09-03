import type { Prisma } from "@prisma/client";
import { userPublicSelectMinimal } from "@/lib/user-public-select";
import type { ChatAttachmentView } from "@/lib/chat-attachments";
import {
  attachMessageMediaAccess,
  type MessageAttachmentAccessRow,
} from "@/lib/message-paid-media";
import type { ChatMessageView } from "@/lib/chat-message-normalize";

export const chatMessageInclude = {
  sender: { select: userPublicSelectMinimal },
  attachments: true,
  replyTo: {
    include: {
      sender: { select: userPublicSelectMinimal },
      attachments: true,
    },
  },
} satisfies Prisma.MessageInclude;

type MessageRow = Prisma.MessageGetPayload<{ include: typeof chatMessageInclude }>;

export type SerializeChatMessageOptions = {
  viewerId?: string | null;
  purchasedAttachmentIds?: Set<string>;
  /** Socket relay — never leak paid attachment URLs */
  forRelay?: boolean;
};

function serializeAttachments(
  attachments: MessageRow["attachments"],
  senderId: string,
  opts?: SerializeChatMessageOptions
): ChatAttachmentView[] {
  const purchased = opts?.purchasedAttachmentIds ?? new Set<string>();
  const rows: MessageAttachmentAccessRow[] = attachments.map((a) => ({
    id: a.id,
    url: a.url,
    type: a.type,
    name: a.name,
    priceKrw: a.priceKrw,
  }));
  // No viewer context means no entitlement can be proven — fail closed so a
  // paid origin URL is never serialized.
  if (opts?.forRelay || !opts?.viewerId) {
    return rows.map((a) => {
      const paid = (a.priceKrw ?? 0) > 0;
      return paid ? { ...a, url: "", locked: true } : a;
    });
  }
  return attachMessageMediaAccess({ senderId, attachments: rows }, opts.viewerId, purchased)
    .attachments!;
}

function serializeReplyTo(
  replyTo: MessageRow["replyTo"],
  opts?: SerializeChatMessageOptions
) {
  if (!replyTo) return undefined;
  return {
    id: replyTo.id,
    content: replyTo.content,
    sender: replyTo.sender,
    attachments: serializeAttachments(replyTo.attachments, replyTo.sender.id, opts),
  };
}

export function serializeChatMessage(m: MessageRow, opts?: SerializeChatMessageOptions): ChatMessageView {
  return {
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    sender: m.sender,
    attachments: serializeAttachments(m.attachments, m.sender.id, opts),
    replyTo: serializeReplyTo(m.replyTo, opts),
  };
}

export function serializeChatMessages(
  messages: MessageRow[],
  viewerId: string,
  purchasedAttachmentIds: Set<string>
): ChatMessageView[] {
  const opts = { viewerId, purchasedAttachmentIds };
  return messages.map((m) => serializeChatMessage(m, opts));
}

export function serializeChatMessageForRelay(m: MessageRow) {
  return serializeChatMessage(m, { forRelay: true });
}

export type SerializedChatMessage = ChatMessageView;
