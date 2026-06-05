import type { MessageAttachmentType } from "@prisma/client";

export type ChatAttachmentInput = {
  url: string;
  type: MessageAttachmentType;
  name?: string;
};

export type ChatAttachmentView = {
  id: string;
  url: string;
  type: MessageAttachmentType;
  name?: string | null;
};

const ALLOWED: MessageAttachmentType[] = ["IMAGE", "VIDEO", "AUDIO", "GIF", "STICKER", "FILE"];

export function parseChatAttachmentType(raw: string): MessageAttachmentType | null {
  const u = raw.toUpperCase();
  return ALLOWED.includes(u as MessageAttachmentType) ? (u as MessageAttachmentType) : null;
}

export function sanitizeChatAttachments(
  raw: unknown,
  max = 8
): ChatAttachmentInput[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatAttachmentInput[] = [];
  for (const item of raw) {
    if (out.length >= max) break;
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const url = typeof o.url === "string" ? o.url.trim() : "";
    const type = typeof o.type === "string" ? parseChatAttachmentType(o.type) : null;
    if (!url.startsWith("https://") || !type) continue;
    out.push({
      url: url.slice(0, 2048),
      type,
      name: typeof o.name === "string" ? o.name.slice(0, 200) : undefined,
    });
  }
  return out;
}

export function lastMessagePreview(
  content: string | null | undefined,
  attachments?: { type: MessageAttachmentType }[]
): string {
  if (content?.trim()) return content.trim();
  if (!attachments?.length) return "대화를 시작해 보세요";
  const hasImage = attachments.some((a) => a.type === "IMAGE" || a.type === "GIF");
  const hasAudio = attachments.some((a) => a.type === "AUDIO");
  const hasVideo = attachments.some((a) => a.type === "VIDEO");
  if (hasImage && hasAudio) return "사진 · 음성";
  if (hasImage) return "사진";
  if (hasAudio) return "음성 메시지";
  if (hasVideo) return "동영상";
  return "첨부 파일";
}
