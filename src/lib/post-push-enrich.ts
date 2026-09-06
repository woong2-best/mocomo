import { db } from "@/lib/db";

const POST_INTERACTION_TYPES = new Set([
  "like",
  "repost",
  "comment",
  "comment_reply",
  "comment_like",
  "comment_author_like",
  "comment_pin",
  "mention",
  "vote",
]);

export const POST_INTERACTION_CATEGORY = "post_interaction";

export function extractPostIdFromLink(link?: string | null): string | null {
  if (!link) return null;
  const match = link.match(/\/post\/([^#/?]+)/);
  return match?.[1] ?? null;
}

export function isPostInteractionPush(type: string, link?: string | null): boolean {
  return POST_INTERACTION_TYPES.has(type) && !!extractPostIdFromLink(link);
}

function absoluteMediaUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://mocomo.net").replace(/\/$/, "");
  return url.startsWith("/") ? `${base}${url}` : `${base}/${url}`;
}

export async function buildPostInteractionPushData(params: {
  postId: string;
  actorId?: string | null;
  body?: string | null;
}): Promise<Record<string, string>> {
  const [post, actor] = await Promise.all([
    db.post.findUnique({
      where: { id: params.postId },
      select: {
        content: true,
        media: {
          orderBy: { order: "asc" },
          take: 1,
          select: { url: true, posterUrl: true, type: true },
        },
      },
    }),
    params.actorId
      ? db.user.findUnique({
          where: { id: params.actorId },
          select: { username: true, name: true, image: true },
        })
      : Promise.resolve(null),
  ]);

  const media = post?.media[0];
  let imageUrl = "";
  if (media) {
    const raw = media.type === "VIDEO" ? media.posterUrl || media.url : media.url;
    if (raw) imageUrl = absoluteMediaUrl(raw);
  }

  const actorImage = actor?.image ? absoluteMediaUrl(actor.image) : "";
  const preview = (post?.content || params.body || "").replace(/\s+/g, " ").trim().slice(0, 280);
  const actorUsername = actor?.username || "";
  const actorName = actor?.name || actorUsername;

  return {
    categoryId: POST_INTERACTION_CATEGORY,
    postId: params.postId,
    actorUsername,
    actorName,
    actorImage,
    preview,
    imageUrl,
    subtitle: actorUsername ? `@${actorUsername}` : "",
  };
}
