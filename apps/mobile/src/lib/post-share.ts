const POST_ORIGIN = "https://mocomo.net";

export function postPath(postId: string): string {
  return `/post/${postId}`;
}

export function postUrl(postId: string): string {
  return `${POST_ORIGIN}${postPath(postId)}`;
}

/** 인용 게시 — 사용자 코멘트를 위에 쓰고 아래에 원문 인용 (web `buildPostRepostQuoteDraft`) */
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
