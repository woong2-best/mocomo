"use server";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");
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
  if (!title || title.length < 2) return { error: "actions.sojdmy3" };
  if (!description || description.length < 10) {
    return { error: "actions.swvvgax" };
  }

  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: "actions.s1hmc1h3" };
  }
  if (endsAt <= startsAt) return { error: "actions.s1yi5u57" };
  const days = eventDurationDays(startsAt, endsAt);
  if (days > EVENT_REGISTRATION_MAX_DAYS) {
    return { error: t("actions.s1nb9s3y", { v0: EVENT_REGISTRATION_MAX_DAYS }) };
  }

  const images = (data.images ?? []).filter(Boolean).slice(0, 8);
  const cover = data.imageUrl?.trim() || null;
  if (!cover) return { error: "actions.1_1" };
  const links = (data.links ?? [])
    .map((l) => ({ label: l.label?.trim() || "Link", url: l.url?.trim() }))
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
    return { error: "actions.s17qrmml" };
  }
  if (event.registrationFeePaid) return { success: true as const };

  await db.event.update({
    where: { id: eventId },
    data: { registrationFeePaid: true, status: "PUBLISHED" },
  });

  revalidatePath("/events");
  revalidatePath("/events/new");
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
    return { error: "actions.sx0eshg" };
  }
  if (!event.registrationFeePaid) {
    return { error: "actions.s16787d9" };
  }

  const imageUrl = data.imageUrl?.trim() || event.imageUrl;
  const linkUrl = data.linkUrl?.trim() || event.linkUrl;
  if (!imageUrl) return { error: "actions.s1851cc5" };
  if (!linkUrl) return { error: "actions.s12emptw" };

  await db.event.update({
    where: { id: eventId },
    data: {
      imageUrl,
      linkUrl,
      title: adTitleFromLink(linkUrl),
    },
  });

  revalidatePath("/events");
  revalidatePath("/events/new");
  revalidatePath("/");
  return { success: true as const };
}

function adTitleFromLink(linkUrl: string): string {
  try {
    const href = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    return new URL(href).hostname.replace(/^www\./, "") || "Ad";
  } catch {
    return "actions.sudwv";
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
