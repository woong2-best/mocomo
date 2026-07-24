import type { MessageAttachmentType } from "@prisma/client";
import { chatPostShareListPreview } from "@/lib/chat-post-share";

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

/** 업로드 URL — https·Supabase·사이트 절대경로 허용 */
export function normalizeChatAttachmentUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 2048) return null;
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) {
    return trimmed;
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    const base =
      process.env.NEXTAUTH_URL ||
      process.env.AUTH_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://mocomo.net";
    return `${base.replace(/\/$/, "")}${trimmed}`;
  }
  return null;
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
    const rawUrl = typeof o.url === "string" ? o.url : "";
    const url = normalizeChatAttachmentUrl(rawUrl);
    const type = typeof o.type === "string" ? parseChatAttachmentType(o.type) : null;
    if (!url || !type) continue;
    out.push({
      url,
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
  const sharePreview = chatPostShareListPreview(content);
  if (sharePreview) return sharePreview;
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
