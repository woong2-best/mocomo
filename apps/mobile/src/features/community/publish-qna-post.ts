import { fetchCommunityDetail, fetchCommunityList } from "@/api/community";
import { createPost } from "@/api/posts";

const IMAGE_URL = /https?:\/\/\S+\.(?:jpg|jpeg|png|webp|gif)(?:\?\S*)?/gi;

export function qnaBodyToPost(name: string, description?: string | null) {
  const raw = (description ?? "").trim();
  const media: { url: string; type: "IMAGE" }[] = [];
  const seen = new Set<string>();
  for (const match of raw.match(IMAGE_URL) ?? []) {
    const url = match.replace(/[),]+$/, "");
    if (seen.has(url)) continue;
    seen.add(url);
    media.push({ url, type: "IMAGE" });
  }
  let content = raw;
  for (const item of media) content = content.split(item.url).join("");
  content = content.replace(/\n{3,}/g, "\n\n").trim();
  if (!content) content = name.trim();
  return { content, media };
}

export async function publishQnaOpeningPost(input: {
  communityId: string;
  name: string;
  description?: string | null;
  isNsfw?: boolean;
}) {
  const { content, media } = qnaBodyToPost(input.name, input.description);
  return createPost({
    content,
    media,
    communityId: input.communityId,
    isAnonymous: true,
    isNsfw: input.isNsfw ?? false,
  });
}

/** Communities created before opening posts existed: owner-only, still empty. */
export async function backfillOwnedEmptyQnaPosts(knownSlugs: Set<string>) {
  const { items } = await fetchCommunityList();
  const candidates = items
    .filter((c) => !knownSlugs.has(c.slug) && c.memberCount <= 1)
    .slice(0, 15);
  let created = 0;
  for (const community of candidates) {
    try {
      const detail = await fetchCommunityDetail(community.slug);
      const item = detail.item;
      if (!item?.isOwner || (item.posts?.length ?? 0) > 0) continue;
      await publishQnaOpeningPost({
        communityId: item.id,
        name: item.name,
        description: item.description,
        isNsfw: item.isNsfw,
      });
      created += 1;
    } catch {
      // Not owner, or posting not allowed — leave the board as-is.
    }
  }
  return created;
}
