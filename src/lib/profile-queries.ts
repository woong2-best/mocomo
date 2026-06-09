import { Prisma } from "@prisma/client";
import { postMediaGallery } from "@/lib/post-media-select";
import { userPublicSelect } from "@/lib/user-public-select";

export const profilePostInclude = {
  author: {
    select: userPublicSelect,
  },
  community: { select: { name: true, slug: true } },
  anime: { select: { title: true, slug: true } },
  media: postMediaGallery,
  _count: { select: { likes: true, comments: true, votes: true } },
} satisfies Prisma.PostInclude;

export type ProfileTab = "posts" | "replies" | "media" | "likes" | "wiki";

export function parseProfileTab(tab?: string | null): ProfileTab {
  if (tab === "replies" || tab === "media" || tab === "likes" || tab === "wiki") return tab;
  return "posts";
}
