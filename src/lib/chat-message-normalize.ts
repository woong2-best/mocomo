import type { SupportTierLevel } from "@prisma/client";

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
};

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
  };
}

export function isPendingMessageId(id: string) {
  return id.startsWith("pending-");
}
