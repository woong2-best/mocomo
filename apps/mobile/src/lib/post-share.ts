import { translate } from "@/i18n/runtime";

const POST_ORIGIN = "https://mocomo.net";

export function postPath(postId: string): string {
  return `/post/${postId}`;
}

export function postUrl(postId: string): string {
  return `${POST_ORIGIN}${postPath(postId)}`;
}

/** Quote-repost draft — user comment on top, original quoted below (web `buildPostRepostQuoteDraft`). */
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
    translate("m.common.post");
  return `\n\n— @${input.authorUsername}: ${preview}\n${url}`;
}
