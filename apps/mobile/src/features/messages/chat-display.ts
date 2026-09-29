import type { ChatAttachment, ChatMessage, ChatReplyTo } from "@/api/messages";
import { uiText } from "@/i18n/ui-text";
import { chatPostShareListPreview } from "@/lib/chat-post-share";
import { chatUsedListingListPreview } from "@/lib/chat-used-listing-share";

export function getChatReplyPreview(
  m: Pick<ChatMessage | ChatReplyTo, "content" | "attachments">,
  locale = "ko"
): string {
  const sharePreview = chatPostShareListPreview(m.content);
  if (sharePreview) return sharePreview;
  const listingPreview = chatUsedListingListPreview(m.content);
  if (listingPreview) return listingPreview;
  const text = m.content?.trim();
  if (text) return text.length > 100 ? `${text.slice(0, 100)}…` : text;
  const att = (m.attachments as ChatAttachment[] | undefined)?.[0];
  if (!att) return uiText(locale, "메시지", "Message");
  if (att.type === "IMAGE" || att.type === "GIF") return uiText(locale, "사진", "Photo");
  if (att.type === "VIDEO") return uiText(locale, "동영상", "Video");
  if (att.type === "AUDIO") return uiText(locale, "음성 메시지", "Voice message");
  return uiText(locale, "첨부 파일", "Attachment");
}

export function formatBubbleTime(iso: string, locale = "ko") {
  const tag = locale === "ko" ? "ko-KR" : "en-US";
  return new Date(iso).toLocaleTimeString(tag, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Instagram DM lightbox — "2일 전", "1시간 전" */
export function formatLightboxTime(iso: string, locale = "ko") {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  if (!Number.isFinite(diffMs) || diffMs < 0) return formatBubbleTime(iso);

  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return uiText(locale, "방금", "Just now");
  if (min < 60) return uiText(locale, `${min}분 전`, `${min}m ago`);

  const hr = Math.floor(min / 60);
  if (hr < 24) return uiText(locale, `${hr}시간 전`, `${hr}h ago`);

  const day = Math.floor(hr / 24);
  if (day < 7) return uiText(locale, `${day}일 전`, `${day}d ago`);

  const tag = locale === "ko" ? "ko-KR" : "en-US";
  return new Date(iso).toLocaleDateString(tag, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function shouldShowMessageTime(messages: ChatMessage[], index: number) {
  const cur = messages[index];
  if (!cur) return false;
  const next = messages[index + 1];
  if (!next) return true;
  if (next.sender.id !== cur.sender.id) return true;
  const gap =
    new Date(next.createdAt).getTime() - new Date(cur.createdAt).getTime();
  return gap > 5 * 60_000;
}
