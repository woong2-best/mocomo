import { Prisma } from "@prisma/client";
import { postMediaProfileTimeline } from "@/lib/post-media-select";
import { userPublicSelect, type UserPublicFields } from "@/lib/user-public-select";

/** 프로필 타임라인 — 작성자는 프로필 주인과 동일하므로 author 조인 생략 */
export const profilePostIncludeLight = {
  community: { select: { name: true, slug: true } },
  anime: { select: { title: true, slug: true } },
  media: postMediaProfileTimeline,
  _count: { select: { likes: true, comments: true, votes: true, media: true } },
} satisfies Prisma.PostInclude;

export const profilePostInclude = {
  author: {
    select: userPublicSelect,
  },
  ...profilePostIncludeLight,
} satisfies Prisma.PostInclude;

export function attachProfilePostAuthor<T extends { authorId: string }>(
  posts: T[],
  author: UserPublicFields
): (T & { author: UserPublicFields })[] {
  return posts.map((post) => ({ ...post, author }));
}

export type ProfileTab = "posts" | "replies" | "media" | "likes" | "wiki";

export type ProfileSort = "new" | "popular";

export type ProfileMediaKind = "all" | "photo" | "video";

export function parseProfileTab(tab?: string | null): ProfileTab {
  if (tab === "replies" || tab === "media" || tab === "likes" || tab === "wiki") return tab;
  return "posts";
}

export function parseProfileSort(sort?: string | null): ProfileSort {
  return sort === "popular" ? "popular" : "new";
}

export function parseProfileMediaKind(kind?: string | null): ProfileMediaKind {
  if (kind === "photo" || kind === "video") return kind;
  return "all";
}

export function profilePostsOrderBy(sort: ProfileSort) {
  if (sort === "popular") {
    return [{ hotScore: "desc" as const }, { createdAt: "desc" as const }];
  }
  return [{ createdAt: "desc" as const }];
}
