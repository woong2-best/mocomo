import type { SupportTierLevel } from "@prisma/client";
import { db } from "@/lib/db";

export type DmUserSearchHit = {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  supportTierSent: SupportTierLevel;
  isFollowing: boolean;
};

const userSelect = {
  id: true,
  username: true,
  name: true,
  image: true,
  supportTierSent: true,
} as const;

const FOLLOWING_LIMIT = 20;
const OTHER_LIMIT = 30;

function normalizeDmSearchQuery(raw: string): string {
  return raw.trim().replace(/^@+/, "").slice(0, 64);
}

function usernamePrefixWhere(q: string) {
  return {
    OR: [
      { username: { startsWith: q, mode: "insensitive" as const } },
      { name: { startsWith: q, mode: "insensitive" as const } },
    ],
  };
}

/**
 * DM compose typeahead: prefix match on username/name.
 * People the viewer follows come first; everyone else follows below.
 */
export async function searchUsersForDm(
  viewerId: string,
  rawQuery: string
): Promise<DmUserSearchHit[]> {
  const q = normalizeDmSearchQuery(rawQuery).slice(0, 32);
  if (q.length < 1) return [];

  const match = usernamePrefixWhere(q);

  const [followingRows, otherRows] = await Promise.all([
    db.user.findMany({
      where: {
        id: { not: viewerId },
        deletedAt: null,
        followers: { some: { followerId: viewerId } },
        ...match,
      },
      take: FOLLOWING_LIMIT,
      orderBy: { username: "asc" },
      select: userSelect,
    }),
    db.user.findMany({
      where: {
        id: { not: viewerId },
        deletedAt: null,
        NOT: { followers: { some: { followerId: viewerId } } },
        ...match,
      },
      take: OTHER_LIMIT,
      orderBy: { username: "asc" },
      select: userSelect,
    }),
  ]);

  return [
    ...followingRows.map((u) => ({ ...u, isFollowing: true })),
    ...otherRows.map((u) => ({ ...u, isFollowing: false })),
  ];
}

/**
 * Collaborator picker: nickname/username prefix + exact User.id (UID).
 */
export async function searchUsersForCollab(
  viewerId: string,
  rawQuery: string
): Promise<DmUserSearchHit[]> {
  const q = normalizeDmSearchQuery(rawQuery);
  if (q.length < 1) return [];

  const [exactById, prefixHits] = await Promise.all([
    db.user.findFirst({
      where: { id: q, deletedAt: null, NOT: { id: viewerId } },
      select: userSelect,
    }),
    searchUsersForDm(viewerId, q),
  ]);

  if (!exactById) return prefixHits;

  const following = await db.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: viewerId,
        followingId: exactById.id,
      },
    },
    select: { id: true },
  });
  const hit: DmUserSearchHit = {
    ...exactById,
    isFollowing: !!following,
  };
  if (prefixHits.some((u) => u.id === hit.id)) return prefixHits;
  return [hit, ...prefixHits];
}
