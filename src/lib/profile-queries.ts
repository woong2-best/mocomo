import { Prisma } from "@prisma/client";
import { postMediaProfileTimeline } from "@/lib/post-media-select";
import { userPublicSelect } from "@/lib/user-public-select";

export const profilePostInclude = {
  author: {
    select: userPublicSelect,
  },
  community: { select: { name: true, slug: true } },
  anime: { select: { title: true, slug: true } },
  media: postMediaProfileTimeline,
  _count: { select: { likes: true, comments: true, votes: true } },
} satisfies Prisma.PostInclude;

export type ProfileTab = "posts" | "replies" | "media" | "likes" | "wiki";

export type ProfileSort = "new" | "popular";

export type ProfileMediaKind = "photo" | "video";

export function parseProfileTab(tab?: string | null): ProfileTab {
  if (tab === "replies" || tab === "media" || tab === "likes" || tab === "wiki") return tab;
  return "posts";
}

export function parseProfileSort(sort?: string | null): ProfileSort {
  return sort === "popular" ? "popular" : "new";
}

export function parseProfileMediaKind(kind?: string | null): ProfileMediaKind | null {
  if (kind === "photo" || kind === "video") return kind;
  return null;
}

export function profilePostsOrderBy(sort: ProfileSort) {
  if (sort === "popular") {
    return [{ hotScore: "desc" as const }, { createdAt: "desc" as const }];
  }
  return [{ createdAt: "desc" as const }];
}
