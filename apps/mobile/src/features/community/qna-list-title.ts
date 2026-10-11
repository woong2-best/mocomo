/** Keep in sync with `src/lib/qna-list-title.ts`. */
export function qnaListTitle(post: {
  title?: string | null;
  content?: string | null;
  community?: { name?: string | null } | null;
}): string {
  const title = post.title?.trim();
  if (title) return title;
  const communityName = post.community?.name?.trim();
  if (communityName) return communityName;
  const line = (post.content ?? "").trim().split("\n")[0] ?? "";
  return line.length > 80 ? `${line.slice(0, 80)}…` : line || "QnA";
}
