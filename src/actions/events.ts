"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  EVENT_REGISTRATION_MAX_DAYS,
  eventDurationDays,
  type EventLinkInput,
} from "@/lib/event-registration";
import { Prisma } from "@prisma/client";

const publishedEventWhere = {
  endsAt: { gte: new Date() },
  OR: [
    { createdById: null },
    { registrationFeePaid: true, status: "PUBLISHED" as const },
  ],
};

export async function createEventDraft(data: {
  title: string;
  description: string;
  type: string;
  startsAt: string;
  endsAt: string;
  prize?: string;
  imageUrl?: string;
  images?: string[];
  linkUrl?: string;
  links?: EventLinkInput[];
  videoUrl?: string;
}) {
  const user = await requireAuth();
  const title = data.title?.trim();
  const description = data.description?.trim();
  if (!title || title.length < 2) return { error: "제목을 입력해 주세요." };
  if (!description || description.length < 10) {
    return { error: "설명을 10자 이상 입력해 주세요." };
  }

  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: "날짜가 올바르지 않습니다." };
  }
  if (endsAt <= startsAt) return { error: "종료일은 시작일 이후여야 합니다." };
  const days = eventDurationDays(startsAt, endsAt);
  if (days > EVENT_REGISTRATION_MAX_DAYS) {
    return { error: `이벤트 기간은 최대 ${EVENT_REGISTRATION_MAX_DAYS}일까지 가능합니다.` };
  }

  const images = (data.images ?? []).filter(Boolean).slice(0, 8);
  const cover = data.imageUrl?.trim() || null;
  if (!cover) return { error: "메인 이미지(1:1)를 등록해 주세요." };
  const links = (data.links ?? [])
    .map((l) => ({ label: l.label?.trim() || "링크", url: l.url?.trim() }))
    .filter((l) => l.url.length > 0)
    .slice(0, 6);

  const event = await db.event.create({
    data: {
      title,
      description,
      type: data.type?.trim() || "other",
      startsAt,
      endsAt,
      prize: data.prize?.trim() || null,
      imageUrl: cover,
      images: images.length > 0 ? images : Prisma.JsonNull,
      linkUrl: data.linkUrl?.trim() || links[0]?.url || null,
      links: links.length > 0 ? links : Prisma.JsonNull,
      videoUrl: data.videoUrl?.trim() || null,
      createdById: user.id,
      status: "AWAITING_FEE",
      registrationFeePaid: false,
    },
  });

  return { eventId: event.id };
}

export async function fulfillEventRegistration(eventId: string, userId: string) {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || event.createdById !== userId) {
    return { error: "이벤트를 찾을 수 없습니다." };
  }
  if (event.registrationFeePaid) return { success: true as const };

  await db.event.update({
    where: { id: eventId },
    data: { registrationFeePaid: true, status: "PUBLISHED" },
  });

  revalidatePath("/events");
  revalidatePath(`/events/new`);
  return { success: true as const };
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

/** 결제한 광고 — 이미지·링크만 수정 (소유자) */
export async function updateEventAdCreative(
  eventId: string,
  data: { imageUrl?: string; linkUrl?: string }
) {
  const user = await requireAuth();
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || event.createdById !== user.id) {
    return { error: "광고를 찾을 수 없습니다." };
  }
  if (!event.registrationFeePaid) {
    return { error: "결제된 광고만 수정할 수 있습니다." };
  }

  const imageUrl = data.imageUrl?.trim() || event.imageUrl;
  const linkUrl = data.linkUrl?.trim() || event.linkUrl;
  if (!imageUrl) return { error: "이미지가 필요합니다." };
  if (!linkUrl) return { error: "링크가 필요합니다." };

  await db.event.update({
    where: { id: eventId },
    data: {
      imageUrl,
      linkUrl,
      title: adTitleFromLink(linkUrl),
    },
  });

  revalidatePath("/events");
  revalidatePath("/");
  revalidatePath("/events/new");
  return { success: true as const };
}

function adTitleFromLink(linkUrl: string): string {
  try {
    const href = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    return new URL(href).hostname.replace(/^www\./, "") || "광고";
  } catch {
    return "광고";
  }
}

export async function getEvents() {
  return db.event.findMany({
    where: publishedEventWhere,
    take: 40,
    orderBy: { startsAt: "asc" },
    include: {
      _count: { select: { participants: true } },
      createdBy: { select: { username: true, name: true } },
    },
  });
}

export async function getUserEventDraft(eventId: string) {
  const user = await requireAuth();
  const event = await db.event.findFirst({
    where: { id: eventId, createdById: user.id },
  });
  if (!event) return null;
  return event;
}

export async function getRankings(category: string) {
  return db.rankingEntry.findMany({
    where: { category },
    orderBy: { rank: "asc" },
    take: 20,
  });
}
