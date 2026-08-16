/**
 * DM post-share markers — keep in sync with src/lib/chat-post-share.ts
 */

export const POST_SHARE_MARKER_PREFIX = "[[mocomo:post-share:";
export const POST_SHARE_MARKER_SUFFIX = "]]";

const MARKER_RE = /\[\[mocomo:post-share:([a-z0-9]+)\]\]/i;
const POST_PATH_RE =
  /(?:https?:\/\/(?:www\.)?(?:mocomo\.net|localhost(?::\d+)?))?\/post\/([a-z0-9]+)/i;
const URL_RE = /(https?:\/\/[^\s]+)/gi;

export type ParsedChatPostShare = {
  postId: string;
  note: string | null;
  structured: boolean;
};

export function parseChatPostShare(
  content: string | null | undefined
): ParsedChatPostShare | null {
  if (!content?.trim()) return null;
  const text = content.trim();

  const markerMatch = text.match(MARKER_RE);
  if (markerMatch?.[1]) {
    const note = text
      .replace(MARKER_RE, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    return {
      postId: markerMatch[1],
      note: note || null,
      structured: true,
    };
  }

  const pathMatch = text.match(POST_PATH_RE);
  if (!pathMatch?.[1]) return null;

  const postId = pathMatch[1];
  const looksLikeAutoShare =
    /님의 게시물/.test(text) ||
    /^@\w[\w.-]*님의/.test(text) ||
    (text.match(/https?:\/\//g)?.length ?? 0) >= 1;

  if (looksLikeAutoShare) {
    return { postId, note: null, structured: false };
  }

  const note = text
    .replace(POST_PATH_RE, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return {
    postId,
    note: note || null,
    structured: false,
  };
}

export function chatPostShareListPreview(
  content: string | null | undefined
): string | null {
  const parsed = parseChatPostShare(content);
  if (!parsed) return null;
  if (parsed.note) {
    return parsed.note.length > 40 ? `${parsed.note.slice(0, 40)}…` : parsed.note;
  }
  return "게시물 공유";
}

export function splitTextWithUrls(text: string): { text: string; url?: string }[] {
  const parts: { text: string; url?: string }[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const idx = match.index ?? 0;
    if (idx > last) parts.push({ text: text.slice(last, idx) });
    parts.push({ text: match[0], url: match[0] });
    last = idx + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts.length ? parts : [{ text }];
}

export const CHAT_EMOJIS = ["😀", "😂", "❤️", "👍", "👋", "🙏", "😢", "😮", "☕"] as const;
