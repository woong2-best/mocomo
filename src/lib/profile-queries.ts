import { Prisma } from "@prisma/client";

export const profilePostInclude = {
  author: {
    select: {
      id: true,
      username: true,
      name: true,
      image: true,
      level: true,
      cosplayerProfile: { select: { stageName: true } },
    },
  },
  community: { select: { name: true, slug: true } },
  anime: { select: { title: true, slug: true } },
  media: true,
  _count: { select: { likes: true, comments: true, votes: true } },
} satisfies Prisma.PostInclude;

export type ProfileTab = "posts" | "replies" | "media" | "likes";

export function parseProfileTab(tab?: string | null): ProfileTab {
  if (tab === "replies" || tab === "media" || tab === "likes") return tab;
  return "posts";
}
