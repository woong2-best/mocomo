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

/** Copy a share URL and show the global info toast (feed/reels globe button). */
export async function copyShareUrl(
  url: string,
  toastMessage: string
): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    const { pushInfoToast } = await import("@/lib/published-toast-store");
    pushInfoToast({ message: toastMessage, durationMs: 2500 });
    return true;
  } catch {
    return false;
  }
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
    "Post";
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
    "Post";
  const prefix = input.hasVideo ? "🎬 Video 게시물 공유" : "📎 Share post";
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
    "Post";
  return `\n\n— @${input.authorUsername}: ${preview}\n${url}`;
}
