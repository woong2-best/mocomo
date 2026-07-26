import { Prisma } from "@prisma/client";
import { postMediaProfileTimeline } from "@/lib/post-media-select";
import { userPublicSelect, type UserPublicFields } from "@/lib/user-public-select";
import { postCollaboratorsInclude } from "@/lib/post-collaborator-select";

/** 프로필 타임라인 — 실제 author + ACCEPTED collaborators 포함 */
export const profilePostIncludeLight = {
  author: { select: userPublicSelect },
  collaborators: postCollaboratorsInclude,
  community: { select: { name: true, slug: true } },
  anime: { select: { title: true, slug: true } },
  media: postMediaProfileTimeline,
  _count: { select: { likes: true, comments: true, votes: true, reposts: true, media: true } },
} satisfies Prisma.PostInclude;

export const profilePostInclude = {
  ...profilePostIncludeLight,
} satisfies Prisma.PostInclude;

/** @deprecated Prefer real author from include; kept for reply fallbacks */
export function attachProfilePostAuthor<T extends { authorId: string; author?: UserPublicFields }>(
  posts: T[],
  author: UserPublicFields
): (T & { author: UserPublicFields })[] {
  return posts.map((post) => ({
    ...post,
    author: post.author ?? author,
  }));
}

export type ProfileTab = "posts" | "replies" | "media" | "likes" | "wiki";

export type ProfileSort = "new" | "popular" | "oldest";

export type ProfileMediaKind = "all" | "photo" | "video";

export function parseProfileTab(tab?: string | null): ProfileTab {
  if (tab === "replies" || tab === "media" || tab === "likes" || tab === "wiki") return tab;
  return "posts";
}

export function parseProfileSort(sort?: string | null): ProfileSort {
  if (sort === "popular") return "popular";
  if (sort === "oldest") return "oldest";
  return "new";
}

export function parseProfileMediaKind(kind?: string | null): ProfileMediaKind {
  if (kind === "photo" || kind === "video") return kind;
  return "all";
}

/** Append non-default sort to URLSearchParams (default = new). */
export function appendProfileSortParam(params: URLSearchParams, sort: ProfileSort) {
  if (sort !== "new") params.set("sort", sort);
}

export function profilePostsOrderBy(sort: ProfileSort) {
  if (sort === "popular") {
    return [{ hotScore: "desc" as const }, { createdAt: "desc" as const }];
  }
  if (sort === "oldest") {
    return [{ createdAt: "asc" as const }];
  }
  return [{ createdAt: "desc" as const }];
}
