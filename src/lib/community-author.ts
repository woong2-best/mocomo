import { ANONYMOUS_DISPLAY_NAME } from "@/lib/anonymous-post";

/**
 * DCInside shows `닉네임 (112.333)` next to writers.
 * MoCoMo uses the account id in that slot: `닉네임 (아이디)`.
 * Anonymous QnA keeps a DB authorId but never shows it here.
 */
export function galleryAuthorLabel(
  name: string | null | undefined,
  username: string,
  isAnonymous = false
): string {
  if (isAnonymous) return ANONYMOUS_DISPLAY_NAME;
  const nick = name?.trim() || username;
  return `${nick} (${username})`;
}

export const COMMUNITY_CONCEPT_LIKE_MIN = 10;
