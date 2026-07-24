/**
 * DM "메세지 보내기" — Twitter-style shared post payload.
 * Structured marker is preferred; plain /post/{id} URLs still parse (legacy shares).
 */

export const POST_SHARE_MARKER_PREFIX = "[[mocomo:post-share:";
export const POST_SHARE_MARKER_SUFFIX = "]]";

const MARKER_RE = /\[\[mocomo:post-share:([a-z0-9]+)\]\]/i;
const POST_PATH_RE =
  /(?:https?:\/\/(?:www\.)?(?:mocomo\.net|localhost(?::\d+)?))?\/post\/([a-z0-9]+)/i;

export type ParsedChatPostShare = {
  postId: string;
  /** User-written note above the shared card (optional) */
  note: string | null;
  /** True when message used the structured marker (new shares) */
  structured: boolean;
};

export function encodePostShareMessage(postId: string, note?: string): string {
  const id = postId.trim();
  const marker = `${POST_SHARE_MARKER_PREFIX}${id}${POST_SHARE_MARKER_SUFFIX}`;
  const n = (note ?? "").trim();
  return n ? `${n}\n\n${marker}` : marker;
}

export function extractPostIdFromChatContent(
  content: string | null | undefined
): string | null {
  if (!content) return null;
  const marker = content.match(MARKER_RE);
  if (marker?.[1]) return marker[1];
  const path = content.match(POST_PATH_RE);
  return path?.[1] ?? null;
}

/**
 * Parse a chat message into optional note + shared post id.
 * Legacy plain-text shares (`@user님의 게시물… /post/id`) become card-only (no raw URL dump).
 */
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
  // Classic buildPostShareMessage dump — hide raw body, show card only
  const looksLikeAutoShare =
    /님의 게시물/.test(text) ||
    /^@\w[\w.-]*님의/.test(text) ||
    (text.match(/https?:\/\//g)?.length ?? 0) >= 1;

  if (looksLikeAutoShare) {
    return { postId, note: null, structured: false };
  }

  // Mixed freeform text + post link — keep non-URL note
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
    const short =
      parsed.note.length > 40 ? `${parsed.note.slice(0, 40)}…` : parsed.note;
    return short;
  }
  return "게시물 공유";
}
