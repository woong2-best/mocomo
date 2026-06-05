import type { SupportTierLevel } from "@prisma/client";
import type { ChatAttachmentView } from "@/lib/chat-attachments";
import { parseChatAttachmentType } from "@/lib/chat-attachments";

export type ChatMessageView = {
  id: string;
  content: string | null;
  createdAt: string;
  sender: {
    id: string;
    username: string;
    image: string | null;
    supportTierSent?: SupportTierLevel;
  };
  attachments?: ChatAttachmentView[];
};

function normalizeAttachments(raw: unknown): ChatAttachmentView[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const list: ChatAttachmentView[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const a = item as Record<string, unknown>;
    const id = typeof a.id === "string" ? a.id : `att-${list.length}`;
    const url = typeof a.url === "string" ? a.url : "";
    const type =
      typeof a.type === "string" ? parseChatAttachmentType(a.type) : null;
    if (!url || !type) continue;
    list.push({
      id,
      url,
      type,
      name: typeof a.name === "string" ? a.name : null,
    });
  }
  return list.length ? list : undefined;
}

export function normalizeChatMessage(
  raw: unknown,
  fallback?: { id: string; username: string; image?: string | null; supportTierSent?: SupportTierLevel }
): ChatMessageView | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const sender = m.sender as Record<string, unknown> | undefined;
  const id = typeof m.id === "string" ? m.id : null;
  if (!id) return null;

  const created =
    typeof m.createdAt === "string"
      ? m.createdAt
      : m.createdAt instanceof Date
        ? m.createdAt.toISOString()
        : new Date().toISOString();

  const senderId =
    typeof sender?.id === "string" ? sender.id : fallback?.id ?? "";
  const senderUsername =
    typeof sender?.username === "string" ? sender.username : fallback?.username ?? "user";

  return {
    id,
    content: typeof m.content === "string" ? m.content : null,
    createdAt: created,
    sender: {
      id: senderId,
      username: senderUsername,
      image: typeof sender?.image === "string" ? sender.image : fallback?.image ?? null,
      supportTierSent:
        (sender?.supportTierSent as SupportTierLevel | undefined) ?? fallback?.supportTierSent,
    },
    attachments: normalizeAttachments(m.attachments),
  };
}

export function isPendingMessageId(id: string) {
  return id.startsWith("pending-");
}
