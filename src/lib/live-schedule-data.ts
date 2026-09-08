import { unstable_cache } from "next/cache";
import { db } from "@/lib/db";
import type { LiveStreamCategory } from "@prisma/client";

export type LiveScheduleEntry = {
  userId: string;
  username: string;
  image: string | null;
  scheduleNote: string;
  isPartner: boolean;
  followerCount: number;
};

export type LiveScheduledBroadcast = {
  id: string;
  name: string;
  createdBy: string;
  scheduledAt: Date;
  category: LiveStreamCategory;
  thumbnailUrl: string | null;
  broadcastMode?: string | null;
  host?: {
    username: string;
    image: string | null;
  };
};

async function fetchScheduleEntries() {
  const rows = await db.streamerProfile.findMany({
    where: {
      scheduleNote: { not: null },
      NOT: { scheduleNote: "" },
    },
    orderBy: { updatedAt: "desc" },
    take: 60,
    select: {
      scheduleNote: true,
      isPartner: true,
      user: {
        select: {
          id: true,
          username: true,
          image: true,
          _count: { select: { followers: true } },
        },
      },
    },
  });

  return rows
    .filter((r) => r.scheduleNote?.trim())
    .map(
      (r) =>
        ({
          userId: r.user.id,
          username: r.user.username,
          image: r.user.image,
          scheduleNote: r.scheduleNote!.trim(),
          isPartner: r.isPartner,
          followerCount: r.user._count.followers,
        }) satisfies LiveScheduleEntry
    );
}

async function fetchScheduledBroadcasts() {
  const channels = await db.voiceChannel.findMany({
    where: { liveStatus: "SCHEDULED", scheduledAt: { gte: new Date() } },
    orderBy: { scheduledAt: "asc" },
    take: 24,
    select: {
      id: true,
      name: true,
      createdBy: true,
      scheduledAt: true,
      category: true,
      thumbnailUrl: true,
      broadcastMode: true,
    },
  });

  const hostIds = [...new Set(channels.map((c) => c.createdBy))];
  const hosts =
    hostIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: hostIds } },
          select: { id: true, username: true, image: true },
        })
      : [];
  const hostMap = Object.fromEntries(hosts.map((h) => [h.id, h]));

  return channels
    .filter((c): c is typeof c & { scheduledAt: Date } => c.scheduledAt != null)
    .map(
      (c) =>
        ({
          id: c.id,
          name: c.name,
          createdBy: c.createdBy,
          scheduledAt: c.scheduledAt,
          category: c.category,
          thumbnailUrl: c.thumbnailUrl,
          broadcastMode: c.broadcastMode,
          host: hostMap[c.createdBy],
        }) satisfies LiveScheduledBroadcast
    );
}

export async function getLiveScheduleBoard() {
  const [entries, broadcasts] = await Promise.all([
    unstable_cache(fetchScheduleEntries, ["live-schedule-entries"], { revalidate: 60 })(),
    unstable_cache(fetchScheduledBroadcasts, ["live-schedule-broadcasts"], { revalidate: 30 })(),
  ]);

  return { entries, broadcasts };
}
