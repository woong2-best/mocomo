import type { SupportTierLevel } from "@prisma/client";
import type { ChatAttachmentView } from "@/lib/chat-attachments";
import { parseChatAttachmentType } from "@/lib/chat-attachments";
import { chatPostShareListPreview } from "@/lib/chat-post-share";

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
  replyTo?: {
    id: string;
    content: string | null;
    sender: {
      id: string;
      username: string;
      image: string | null;
      supportTierSent?: SupportTierLevel;
    };
    attachments?: ChatAttachmentView[];
  };
};

export function getChatMessageReplyPreview(
  m: Pick<ChatMessageView, "content" | "attachments">
): string {
  const sharePreview = chatPostShareListPreview(m.content);
  if (sharePreview) return sharePreview;
  const text = m.content?.trim();
  if (text) return text.length > 100 ? `${text.slice(0, 100)}…` : text;
  const att = m.attachments?.[0];
  if (!att) return "메시지";
  if (att.type === "IMAGE" || att.type === "GIF") return "사진";
  if (att.type === "VIDEO") return "동영상";
  if (att.type === "AUDIO") return "음성 메시지";
  return "첨부 파일";
}

function normalizeReplyTo(raw: unknown): ChatMessageView["replyTo"] {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : null;
  if (!id) return undefined;
  const sender = r.sender as Record<string, unknown> | undefined;
  const senderId = typeof sender?.id === "string" ? sender.id : "";
  const senderUsername =
    typeof sender?.username === "string" ? sender.username : "user";
  return {
    id,
    content: typeof r.content === "string" ? r.content : null,
    sender: {
      id: senderId,
      username: senderUsername,
      image: typeof sender?.image === "string" ? sender.image : null,
      supportTierSent: sender?.supportTierSent as SupportTierLevel | undefined,
    },
    attachments: normalizeAttachments(r.attachments),
  };
}

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
    const locked = a.locked === true;
    if (!type) continue;
    if (!url && !locked) continue;
    list.push({
      id,
      url,
      type,
      name: typeof a.name === "string" ? a.name : null,
      priceKrw: typeof a.priceKrw === "number" ? a.priceKrw : undefined,
      locked,
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
    replyTo: normalizeReplyTo(m.replyTo),
  };
}

export function isPendingMessageId(id: string) {
  return id.startsWith("pending-");
}
