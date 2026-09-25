import { revalidatePath } from "next/cache";
import type { SupportTierLevel } from "@prisma/client";
import { db } from "@/lib/db";
import { notifyFollow, notifyFollowRequestAccepted } from "@/lib/notifications";

export type IncomingFollowRequest = {
  id: string;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    name: string | null;
    image: string | null;
    supportTierSent: SupportTierLevel;
    bio: string | null;
  };
};

export async function listIncomingFollowRequestsForUser(
  userId: string
): Promise<IncomingFollowRequest[]> {
  const rows = await db.followRequest.findMany({
    where: { targetId: userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      requester: {
        select: {
          id: true,
          username: true,
          name: true,
          image: true,
          supportTierSent: true,
          profile: { select: { bio: true } },
        },
      },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    user: {
      id: r.requester.id,
      username: r.requester.username,
      name: r.requester.name,
      image: r.requester.image,
      supportTierSent: r.requester.supportTierSent,
      bio: r.requester.profile?.bio ?? null,
    },
  }));
}

async function revalidateFollowRequestPaths(targetUsername?: string | null) {
  revalidatePath("/settings");
  if (targetUsername) {
    revalidatePath(`/u/${targetUsername}`);
    revalidatePath(`/u/${targetUsername}/connections`);
  }
}

export async function approveFollowRequestForUser(
  userId: string,
  requesterId: string
): Promise<{ success: true } | { error: string }> {
  if (userId === requesterId) return { error: "Invalid" };

  const req = await db.followRequest.findUnique({
    where: {
      requesterId_targetId: { requesterId, targetId: userId },
    },
    select: { id: true, requester: { select: { username: true } } },
  });
  if (!req) return { error: "요청을 찾을 수 없습니다." };

  await db.$transaction(async (tx) => {
    try {
      await tx.follow.create({
        data: { followerId: requesterId, followingId: userId },
      });
    } catch (e) {
      const code = e && typeof e === "object" && "code" in e ? (e as { code: string }).code : "";
      if (code !== "P2002") throw e;
    }
    await tx.followRequest.delete({ where: { id: req.id } });
  });

  void notifyFollow(userId, requesterId);
  void notifyFollowRequestAccepted(requesterId, userId);
  void import("@/lib/creator-dm-marketing").then(({ sendWelcomeDmOnNewFollow }) =>
    sendWelcomeDmOnNewFollow(userId, requesterId).catch(() => {})
  );

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  await revalidateFollowRequestPaths(me?.username);
  return { success: true };
}

export async function rejectFollowRequestForUser(
  userId: string,
  requesterId: string
): Promise<{ success: true } | { error: string }> {
  const deleted = await db.followRequest.deleteMany({
    where: { requesterId, targetId: userId },
  });
  if (deleted.count === 0) return { error: "요청을 찾을 수 없습니다." };

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { username: true },
  });
  await revalidateFollowRequestPaths(me?.username);
  return { success: true };
}
