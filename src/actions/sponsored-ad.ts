"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  EVENT_REGISTRATION_MAX_DAYS,
  eventDurationDays,
} from "@/lib/event-registration";
import { getPurchasedMoco } from "@/lib/settlement-moco/balance";
import {
  calcSponsoredAdMoco,
  purchaseSponsoredAd,
  SPONSORED_AD_TARGET_EVENT,
  SPONSORED_AD_MAX_DAYS,
} from "@/lib/sponsored-ad";

export async function purchaseEventSponsoredAd(eventId: string, days: number) {
  const user = await requireAuth();
  return purchaseSponsoredAd({
    userId: user.id,
    targetType: SPONSORED_AD_TARGET_EVENT,
    targetId: eventId,
    days,
  });
}

function adTitleFromLink(linkUrl: string): string {
  try {
    const href = linkUrl.startsWith("http") ? linkUrl : `https://${linkUrl}`;
    return new URL(href).hostname.replace(/^www\./, "") || "광고";
  } catch {
    return "광고";
  }
}

/** 이미지·링크·기간만으로 MOCO 광고 등록 — 1일 1 MOCO 선차감 */
export async function registerEventSponsoredAd(data: {
  imageUrl: string;
  linkUrl: string;
  startsAt: string;
  endsAt: string;
}) {
  const user = await requireAuth();
  const imageUrl = data.imageUrl?.trim();
  const linkUrl = data.linkUrl?.trim();
  if (!imageUrl) return { ok: false as const, error: "광고 이미지를 등록해 주세요." };
  if (!linkUrl) return { ok: false as const, error: "클릭 시 이동할 링크를 입력해 주세요." };

  const startsAt = new Date(data.startsAt);
  const endsAt = new Date(data.endsAt);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { ok: false as const, error: "날짜가 올바르지 않습니다." };
  }
  if (endsAt <= startsAt) {
    return { ok: false as const, error: "종료일은 시작일 이후여야 합니다." };
  }

  const days = eventDurationDays(startsAt, endsAt);
  if (days > EVENT_REGISTRATION_MAX_DAYS || days > SPONSORED_AD_MAX_DAYS) {
    return {
      ok: false as const,
      error: `광고 기간은 최대 ${Math.min(EVENT_REGISTRATION_MAX_DAYS, SPONSORED_AD_MAX_DAYS)}일까지 가능합니다.`,
    };
  }

  let mocoCost: number;
  try {
    mocoCost = calcSponsoredAdMoco(days);
  } catch {
    return { ok: false as const, error: "광고 기간을 확인해 주세요." };
  }

  const purchasedMoco = await getPurchasedMoco(user.id);
  if (purchasedMoco < 1) {
    return { ok: false as const, error: "MOCO가 없으면 광고를 등록할 수 없습니다." };
  }
  if (purchasedMoco < mocoCost) {
    return {
      ok: false as const,
      error: `MOCO가 부족합니다. ${mocoCost} MOCO 필요 · 보유 ${purchasedMoco.toLocaleString()} MOCO`,
    };
  }

  const event = await db.event.create({
    data: {
      title: adTitleFromLink(linkUrl),
      description: "",
      type: "other",
      startsAt,
      endsAt,
      imageUrl,
      linkUrl,
      images: Prisma.JsonNull,
      links: Prisma.JsonNull,
      createdById: user.id,
      status: "AWAITING_FEE",
      registrationFeePaid: false,
    },
  });

  const result = await purchaseSponsoredAd({
    userId: user.id,
    targetType: SPONSORED_AD_TARGET_EVENT,
    targetId: event.id,
    days,
  });

  if (!result.ok) {
    await db.event.delete({ where: { id: event.id } }).catch(() => undefined);
    return result;
  }

  revalidatePath("/events");
  revalidatePath("/events/new");
  revalidatePath("/");
  return {
    ok: true as const,
    eventId: event.id,
    mocoPaid: result.mocoPaid,
    expiresAt: result.expiresAt.toISOString(),
  };
}

export async function purchaseSponsoredAdAction(input: {
  targetType: typeof SPONSORED_AD_TARGET_EVENT;
  targetId: string;
  days: number;
}) {
  const user = await requireAuth();
  return purchaseSponsoredAd({
    userId: user.id,
    targetType: input.targetType,
    targetId: input.targetId,
    days: input.days,
  });
}
