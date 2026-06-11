export function absoluteUrl(path: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
  }
  return path.startsWith("/") ? path : `/${path}`;
}

export function postPath(postId: string): string {
  return `/post/${postId}`;
}

export function postUrl(postId: string): string {
  return absoluteUrl(postPath(postId));
}

export function buildPostShareMessage(input: {
  postId: string;
  authorUsername: string;
  title?: string | null;
  content?: string | null;
}): string {
  const url = postUrl(input.postId);
  const preview =
    input.title?.trim() ||
    input.content?.trim().replace(/\s+/g, " ").slice(0, 100) ||
    "게시물";
  return `@${input.authorUsername}님의 게시물\n${preview}\n${url}`;
}

export function buildPostQuoteDraft(input: {
  postId: string;
  authorUsername: string;
  title?: string | null;
  content?: string | null;
  hasVideo?: boolean;
}): string {
  const url = postUrl(input.postId);
  const preview =
    input.title?.trim() ||
    input.content?.trim().replace(/\s+/g, " ").slice(0, 120) ||
    "게시물";
  const prefix = input.hasVideo ? "🎬 영상 게시물 공유" : "📎 게시물 공유";
  return `${prefix}\n\n${preview}\n\n@${input.authorUsername}\n${url}`;
}

/** 인용 게시 — 사용자 코멘트를 위에 쓰고 아래에 원문 인용 */
export function buildPostRepostQuoteDraft(input: {
  postId: string;
  authorUsername: string;
  title?: string | null;
  content?: string | null;
}): string {
  const url = postUrl(input.postId);
  const preview =
    input.title?.trim() ||
    input.content?.trim().replace(/\s+/g, " ").slice(0, 140) ||
    "게시물";
  return `\n\n— @${input.authorUsername}: ${preview}\n${url}`;
}
