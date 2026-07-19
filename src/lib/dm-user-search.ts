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
  return raw.trim().replace(/^@+/, "").slice(0, 32);
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
  const q = normalizeDmSearchQuery(rawQuery);
  if (q.length < 1) return [];

  const match = usernamePrefixWhere(q);

  const [followingRows, otherRows] = await Promise.all([
    db.user.findMany({
      where: {
        id: { not: viewerId },
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
