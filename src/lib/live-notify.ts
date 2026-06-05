import { db } from "@/lib/db";
import { notifyLiveStart } from "@/lib/notifications";

/** 팔로워에게 라이브 시작 알림 (최대 200명) */
export async function notifyFollowersOnLive(hostId: string, channelId: string, title: string) {
  const host = await db.user.findUnique({
    where: { id: hostId },
    select: { username: true },
  });
  if (!host?.username) return;

  const followers = await db.follow.findMany({
    where: { followingId: hostId },
    select: { followerId: true },
    take: 200,
  });
  if (followers.length === 0) return;

  await notifyLiveStart(
    followers.map((f) => f.followerId),
    hostId,
    host.username,
    channelId,
    title
  );
}
