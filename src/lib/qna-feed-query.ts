import type { CommunityCategory, Prisma } from "@prisma/client";
import {
  isCommunityCategory,
  normalizeCommunityCategory,
} from "@/lib/community-labels";
import { isQnaMyCategoryId, QNA_MY_CATEGORY_ID } from "@/lib/qna-my-category";
import { isQnaNsfwCategoryId, QNA_NSFW_CATEGORY_ID } from "@/lib/qna-nsfw-category";

function nsfwGate(canView: boolean): { isNsfw?: false } {
  return canView ? {} : { isNsfw: false };
}

export type QnaCategoryFilter =
  | CommunityCategory
  | typeof QNA_NSFW_CATEGORY_ID
  | typeof QNA_MY_CATEGORY_ID
  | null;

export function parseQnaCategoryParam(raw: string | null | undefined): QnaCategoryFilter {
  const value = raw?.trim();
  if (!value || value === "ALL") return null;
  if (isQnaNsfwCategoryId(value)) return QNA_NSFW_CATEGORY_ID;
  if (isQnaMyCategoryId(value)) return QNA_MY_CATEGORY_ID;
  if (!isCommunityCategory(value)) return null;
  return normalizeCommunityCategory(value);
}

function qnaSearchOr(q: string): Prisma.PostWhereInput | undefined {
  if (!q) return undefined;
  return {
    OR: [
      { title: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
      {
        AND: [{ isAnonymous: false }, { author: { username: { contains: q, mode: "insensitive" } } }],
      },
      {
        AND: [{ isAnonymous: false }, { author: { name: { contains: q, mode: "insensitive" } } }],
      },
      { community: { name: { contains: q, mode: "insensitive" } } },
    ],
  };
}

export function qnaFeedWhere(opts: {
  category: QnaCategoryFilter;
  q: string;
  canViewNsfw: boolean;
  ownerId?: string | null;
}): Prisma.PostWhereInput {
  const q = opts.q.trim();

  if (opts.category === QNA_MY_CATEGORY_ID) {
    if (!opts.ownerId) {
      return {
        id: "__qna_my_denied__",
        communityId: { not: null },
      };
    }
    const search = qnaSearchOr(q);
    return {
      communityId: { not: null },
      authorId: opts.ownerId,
      author: { deletedAt: null },
      ...(search ?? {}),
    };
  }

  if (opts.category === QNA_NSFW_CATEGORY_ID) {
    if (!opts.canViewNsfw) {
      return {
        id: "__qna_nsfw_denied__",
        communityId: { not: null },
      };
    }
    const community: Prisma.CommunityWhereInput = { isNsfw: true };
    const search = qnaSearchOr(q);

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

  const search = qnaSearchOr(q);

  return {
    communityId: { not: null },
    visibility: "PUBLIC",
    author: { deletedAt: null },
    ...nsfwGate(opts.canViewNsfw),
    community,
    ...(search ?? {}),
  };
}
