"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isOperatorIdentity } from "@/lib/operator-config";
import { EVENT_REGISTRATION_MAX_DAYS } from "@/lib/event-registration";
import { getPurchasedMoco } from "@/lib/settlement-moco/balance";
import {
  activateSponsoredAdComplimentary,
  calcOperatorUnlimitedExpiresAt,
  calcSponsoredAdEndTime,
  calcSponsoredAdMoco,
  purchaseSponsoredAd,
  SPONSORED_AD_TARGET_EVENT,
  SPONSORED_AD_MAX_DAYS,
  SPONSORED_AD_OPERATOR_UNLIMITED_MAX_DAYS,
  validateSponsoredAdSchedule,
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

/** 이미지·링크·기간만으로 MOCO 광고 등록 — 24시간(1일)당 1 MOCO 선차감 */
export async function registerEventSponsoredAd(data: {
  imageUrl: string;
  linkUrl: string;
  startsAt: string;
  days: number;
  /** @deprecated 운영자는 항상 무제한 — 하위 호환용 */
  operatorUnlimited?: boolean;
}) {
  const user = await requireAuth();
  const imageUrl = data.imageUrl?.trim();
  const linkUrl = data.linkUrl?.trim();
  if (!imageUrl) return { ok: false as const, error: "광고 이미지를 등록해 주세요." };
  if (!linkUrl) return { ok: false as const, error: "클릭 시 이동할 링크를 입력해 주세요." };

  const isOperator = isOperatorIdentity({
    username: user.username,
    role: user.role,
    email: user.email,
  });

  const startsAt = new Date(data.startsAt);
  const now = new Date();

  // 운영자: 기간 선택 무시 — 삭제 전까지 게재
  const days = isOperator
    ? SPONSORED_AD_OPERATOR_UNLIMITED_MAX_DAYS
    : data.days;
  const maxDays = isOperator
    ? SPONSORED_AD_OPERATOR_UNLIMITED_MAX_DAYS
    : Math.min(EVENT_REGISTRATION_MAX_DAYS, SPONSORED_AD_MAX_DAYS);

  const scheduleError = validateSponsoredAdSchedule(startsAt, days, now, {
    skipPastCheck: isOperator,
    maxDays,
  });
  if (scheduleError) {
    return { ok: false as const, error: scheduleError };
  }

  const endsAt = isOperator
    ? calcOperatorUnlimitedExpiresAt(startsAt)
    : calcSponsoredAdEndTime(startsAt, days);

  let mocoCost = 0;
  if (!isOperator) {
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
      return { ok: false as const, error: "MOCO를 충전해주세요." };
    }
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

  const result = isOperator
    ? await activateSponsoredAdComplimentary({
        userId: user.id,
        targetType: SPONSORED_AD_TARGET_EVENT,
        targetId: event.id,
        days,
        startsAt,
        expiresAt: endsAt,
      })
    : await purchaseSponsoredAd({
        userId: user.id,
        targetType: SPONSORED_AD_TARGET_EVENT,
        targetId: event.id,
        days,
        startsAt,
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
