import type { ChatAttachment, ChatMessage, ChatReplyTo } from "@/api/messages";
import { chatPostShareListPreview } from "@/lib/chat-post-share";

export function getChatReplyPreview(
  m: Pick<ChatMessage | ChatReplyTo, "content" | "attachments">
): string {
  const sharePreview = chatPostShareListPreview(m.content);
  if (sharePreview) return sharePreview;
  const text = m.content?.trim();
  if (text) return text.length > 100 ? `${text.slice(0, 100)}…` : text;
  const att = (m.attachments as ChatAttachment[] | undefined)?.[0];
  if (!att) return "메시지";
  if (att.type === "IMAGE" || att.type === "GIF") return "사진";
  if (att.type === "VIDEO") return "동영상";
  if (att.type === "AUDIO") return "음성 메시지";
  return "첨부 파일";
}

export function formatBubbleTime(iso: string) {
  return new Date(iso).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Instagram DM lightbox — "2일 전", "1시간 전" */
export function formatLightboxTime(iso: string) {
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  if (!Number.isFinite(diffMs) || diffMs < 0) return formatBubbleTime(iso);

  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;

  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;

  return new Date(iso).toLocaleDateString("ko-KR", {
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
