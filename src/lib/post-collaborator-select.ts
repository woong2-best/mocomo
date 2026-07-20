import type { Prisma } from "@prisma/client";
import { userPublicSelect } from "@/lib/user-public-select";

/** Prisma include: ACCEPTED collaborators with minimal public profile (client-safe). */
export const postCollaboratorsInclude = {
  where: { status: "ACCEPTED" as const },
  orderBy: { acceptedAt: "asc" as const },
  select: {
    id: true,
    userId: true,
    status: true,
    acceptedAt: true,
    user: { select: userPublicSelect },
  },
} satisfies Prisma.Post$collaboratorsArgs;

/** Profile / media queries: own posts OR ACCEPTED collaborations. */
export function profilePostsOwnedOrCollabWhere(
  userId: string
): Prisma.PostWhereInput {
  return {
    OR: [
      { authorId: userId },
      {
        collaborators: {
          some: { userId, status: "ACCEPTED" },
        },
      },
    ],
  };
}
