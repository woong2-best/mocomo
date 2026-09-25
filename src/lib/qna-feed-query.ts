import type { CommunityCategory, Prisma } from "@prisma/client";
import {
  isCommunityCategory,
  normalizeCommunityCategory,
} from "@/lib/community-labels";

function nsfwGate(canView: boolean): { isNsfw?: false } {
  return canView ? {} : { isNsfw: false };
}

export function parseQnaCategoryParam(raw: string | null | undefined): CommunityCategory | null {
  const value = raw?.trim();
  if (!value || value === "ALL") return null;
  if (!isCommunityCategory(value)) return null;
  return normalizeCommunityCategory(value);
}

export function qnaFeedWhere(opts: {
  category: CommunityCategory | null;
  q: string;
  canViewNsfw: boolean;
}): Prisma.PostWhereInput {
  const q = opts.q.trim();
  const community: Prisma.CommunityWhereInput = {
    ...nsfwGate(opts.canViewNsfw),
    ...(opts.category ? { category: opts.category } : {}),
  };

  const search: Prisma.PostWhereInput | undefined = q
    ? {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { content: { contains: q, mode: "insensitive" } },
          {
            AND: [
              { isAnonymous: false },
              { author: { username: { contains: q, mode: "insensitive" } } },
            ],
          },
          {
            AND: [
              { isAnonymous: false },
              { author: { name: { contains: q, mode: "insensitive" } } },
            ],
          },
          { community: { name: { contains: q, mode: "insensitive" } } },
        ],
      }
    : undefined;

  return {
    communityId: { not: null },
    visibility: "PUBLIC",
    author: { deletedAt: null },
    ...nsfwGate(opts.canViewNsfw),
    community,
    ...(search ?? {}),
  };
}
