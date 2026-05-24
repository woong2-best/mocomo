"use server";

import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function createEvent(data: {
  title: string;
  description: string;
  type: string;
  startsAt: Date;
  endsAt: Date;
  imageUrl?: string;
  prize?: string;
}) {
  await requireAuth();
  const event = await db.event.create({ data });
  return { event };
}

export async function joinEvent(eventId: string, entryUrl?: string) {
  const user = await requireAuth();
  const participant = await db.eventParticipant.upsert({
    where: { eventId_userId: { eventId, userId: user.id } },
    create: { eventId, userId: user.id, entryUrl },
    update: { entryUrl },
  });
  return { participant };
}

export async function getEvents() {
  return db.event.findMany({
    where: { endsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    include: { _count: { select: { participants: true } } },
  });
}

export async function getRankings(category: string) {
  return db.rankingEntry.findMany({
    where: { category },
    orderBy: { rank: "asc" },
    take: 20,
  });
}
