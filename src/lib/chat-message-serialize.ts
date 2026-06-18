import type { Prisma } from "@prisma/client";
import { userPublicSelectMinimal } from "@/lib/user-public-select";

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

function serializeAttachments(
  attachments: MessageRow["attachments"]
) {
  return attachments.map((a) => ({
    id: a.id,
    url: a.url,
    type: a.type,
    name: a.name,
  }));
}

function serializeReplyTo(replyTo: MessageRow["replyTo"]) {
  if (!replyTo) return undefined;
  return {
    id: replyTo.id,
    content: replyTo.content,
    sender: replyTo.sender,
    attachments: serializeAttachments(replyTo.attachments),
  };
}

export function serializeChatMessage(m: MessageRow) {
  return {
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    sender: m.sender,
    attachments: serializeAttachments(m.attachments),
    replyTo: serializeReplyTo(m.replyTo),
  };
}
