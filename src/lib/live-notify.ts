import { db } from "@/lib/db";

/** 팔로워에게 라이브 시작 알림 (최대 200명) */
export async function notifyFollowersOnLive(hostId: string, channelId: string, title: string) {
  const host = await db.user.findUnique({
    where: { id: hostId },
    select: { username: true },
  });
  if (!host) return;

  const followers = await db.follow.findMany({
    where: { followingId: hostId },
    select: { followerId: true },
    take: 200,
  });
  if (followers.length === 0) return;

  const link = `/voice/${channelId}`;
  const body = `${host.username}님이 「${title.slice(0, 40)}」 방송을 시작했습니다.`;

  await db.notification.createMany({
    data: followers.map((f) => ({
      userId: f.followerId,
      type: "live",
      title: "팔로우 라이브",
      body,
      link,
    })),
    skipDuplicates: true,
  });
}
