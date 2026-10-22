import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { MOCO_OFFICIAL_CHANNEL_ID, MOCO_OFFICIAL_USERNAME } from "@/lib/ai-live/official-channel-id";

export type MocoOfficialChannel = {
  channelId: string;
  hostUserId: string;
};

async function officialUserId(): Promise<string> {
  const existing = await db.user.findUnique({
    where: { username: MOCO_OFFICIAL_USERNAME },
    select: { id: true },
  });
  if (existing) return existing.id;

  try {
    const created = await db.user.create({
      data: {
        username: MOCO_OFFICIAL_USERNAME,
        name: "Moco",
        locale: "en",
        countryCode: "KR",
      },
      select: { id: true },
    });
    return created.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const again = await db.user.findUnique({
        where: { username: MOCO_OFFICIAL_USERNAME },
        select: { id: true },
      });
      if (again) return again.id;
    }
    throw err;
  }
}

/** Keeps one first-party channel LIVE so the normal MOCO donation API can pay her. */
export async function ensureMocoOfficialChannel(): Promise<MocoOfficialChannel> {
  const ready = await db.voiceChannel.findUnique({
    where: { id: MOCO_OFFICIAL_CHANNEL_ID },
    select: { createdBy: true, isLive: true, liveStatus: true, endedAt: true },
  });
  if (ready?.isLive && ready.liveStatus === "LIVE" && !ready.endedAt) {
    return { channelId: MOCO_OFFICIAL_CHANNEL_ID, hostUserId: ready.createdBy };
  }

  const hostUserId = await officialUserId();
  await db.voiceChannel.upsert({
    where: { id: MOCO_OFFICIAL_CHANNEL_ID },
    create: {
      id: MOCO_OFFICIAL_CHANNEL_ID,
      name: "Moco",
      createdBy: hostUserId,
      isLive: true,
      liveStatus: "LIVE",
      mediaSourceType: "FIRST_PARTY",
      broadcastMode: "BROWSER",
      category: "JUST_CHATTING",
      liveVisibility: "PUBLIC",
      donationAlertsOnStream: true,
      maxUsers: 5000,
      thumbnailUrl: "/live/moco-poster.png",
      endedAt: null,
    },
    update: {
      createdBy: hostUserId,
      isLive: true,
      liveStatus: "LIVE",
      donationAlertsOnStream: true,
      endedAt: null,
      thumbnailUrl: "/live/moco-poster.png",
    },
  });
  return { channelId: MOCO_OFFICIAL_CHANNEL_ID, hostUserId };
}
