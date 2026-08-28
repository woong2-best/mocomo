import type { Prisma } from "@prisma/client";
import { userPublicSelect } from "@/lib/user-public-select";
import { platformPostWhere } from "@/lib/post-scope";

/** Post header credit: show invited (PENDING) + accepted collaborators. */
export const postCollaboratorsHeaderInclude = {
  where: { status: { in: ["PENDING", "ACCEPTED"] as const } },
  orderBy: [{ status: "asc" as const }, { acceptedAt: "asc" as const }, { invitedAt: "asc" as const }],
  select: {
    id: true,
    userId: true,
    status: true,
    acceptedAt: true,
    user: { select: userPublicSelect },
  },
} satisfies Prisma.Post$collaboratorsArgs;

/** @deprecated alias — prefer postCollaboratorsHeaderInclude for UI */
export const postCollaboratorsInclude = postCollaboratorsHeaderInclude;

/** Profile / media queries: own posts OR ACCEPTED collaborations only. */
export function profilePostsOwnedOrCollabWhere(
  userId: string
): Prisma.PostWhereInput {
  return {
    ...platformPostWhere,
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
