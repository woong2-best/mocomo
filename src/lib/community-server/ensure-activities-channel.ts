import { db } from "@/lib/db";

/** 기존 커뮤니티에도 Activities 채널이 없으면 추가 */
export async function ensureCommunityActivitiesChannel(communityId: string) {
  const existing = await db.communityChannel.findFirst({
    where: { communityId, type: "ACTIVITY" },
    select: { id: true },
  });
  if (existing) return existing.id;

  const voiceCat = await db.communityChannelCategory.findFirst({
    where: { communityId, name: "음성·영상" },
    select: { id: true },
  });

  let categoryId = voiceCat?.id;
  if (!categoryId) {
    const created = await db.communityChannelCategory.create({
      data: { communityId, name: "음성·영상", position: 1 },
      select: { id: true },
    });
    categoryId = created.id;
  }

  const maxPos = await db.communityChannel.aggregate({
    where: { communityId, categoryId },
    _max: { position: true },
  });

  const channel = await db.communityChannel.create({
    data: {
      communityId,
      categoryId,
      type: "ACTIVITY",
      name: "Activities",
      slug: "activities",
      position: (maxPos._max.position ?? 0) + 1,
    },
    select: { id: true },
  });

  return channel.id;
}
