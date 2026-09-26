import type { CommunityCategory, Prisma } from "@prisma/client";
import {
  isCommunityCategory,
  normalizeCommunityCategory,
} from "@/lib/community-labels";
import { isQnaNsfwCategoryId, QNA_NSFW_CATEGORY_ID } from "@/lib/qna-nsfw-category";

function nsfwGate(canView: boolean): { isNsfw?: false } {
  return canView ? {} : { isNsfw: false };
}

export type QnaCategoryFilter = CommunityCategory | typeof QNA_NSFW_CATEGORY_ID | null;

export function parseQnaCategoryParam(raw: string | null | undefined): QnaCategoryFilter {
  const value = raw?.trim();
  if (!value || value === "ALL") return null;
  if (isQnaNsfwCategoryId(value)) return QNA_NSFW_CATEGORY_ID;
  if (!isCommunityCategory(value)) return null;
  return normalizeCommunityCategory(value);
}

export function qnaFeedWhere(opts: {
  category: QnaCategoryFilter;
  q: string;
  canViewNsfw: boolean;
}): Prisma.PostWhereInput {
  const q = opts.q.trim();

  if (opts.category === QNA_NSFW_CATEGORY_ID) {
    if (!opts.canViewNsfw) {
      return {
        id: "__qna_nsfw_denied__",
        communityId: { not: null },
      };
    }
    const community: Prisma.CommunityWhereInput = { isNsfw: true };
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
      isNsfw: true,
      community,
      ...(search ?? {}),
    };
  }

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
