"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  DEFAULT_CREATOR_SUBSCRIPTION_PRICE_KRW,
  isSubscriptionActive,
  monthsSubscribed,
  tierFromSubscriptionMonths,
} from "@/lib/creator-subscription";
import { formatUsd } from "@/lib/money";
import { stripeConnectStatus } from "@/lib/stripe-connect";

export async function getCreatorMonetizationSettings() {
  const user = await requireAuth();
  const row = await db.user.findUnique({
    where: { id: user.id },
    select: {
      creatorSubscriptionPriceKrw: true,
      stripeConnectAccountId: true,
    },
  });
  if (!row) return { error: "사용자를 찾을 수 없습니다." };

  return {
    subscriptionPriceKrw: row.creatorSubscriptionPriceKrw,
    connect: stripeConnectStatus(row.stripeConnectAccountId),
  };
}

export async function updateCreatorSubscriptionPrice(priceKrw: number) {
  const user = await requireAuth();
  const price = Math.floor(priceKrw);
  if (price < 100 || price > 50_000) {
    return { error: `구독 가격은 ${formatUsd(100)} ~ ${formatUsd(50_000)} 사이로 설정해 주세요.` };
  }

  await db.user.update({
    where: { id: user.id },
    data: { creatorSubscriptionPriceKrw: price },
  });

  if (user.username) revalidatePath(`/u/${user.username}`);
  revalidatePath("/settings/creator");
  return { success: true as const, priceKrw: price };
}

export async function getViewerSubscriptionToCreator(creatorId: string) {
  const viewerId = (await requireAuth()).id;
  const sub = await db.subscription.findUnique({
    where: { subscriberId_creatorId: { subscriberId: viewerId, creatorId } },
    select: {
      subscribedSince: true,
      currentPeriodEnd: true,
      status: true,
      amount: true,
    },
  });

  if (!sub || !isSubscriptionActive(sub)) {
    return { active: false as const };
  }

  const months = monthsSubscribed(sub.subscribedSince);
  return {
    active: true as const,
    months,
    tier: tierFromSubscriptionMonths(months),
    currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
    amount: sub.amount,
  };
}

export async function getCreatorPublicMonetization(creatorId: string) {
  const user = await db.user.findUnique({
    where: { id: creatorId },
    select: { creatorSubscriptionPriceKrw: true, username: true },
  });
  if (!user) return null;
  return {
    subscriptionPriceKrw: user.creatorSubscriptionPriceKrw || DEFAULT_CREATOR_SUBSCRIPTION_PRICE_KRW,
    username: user.username,
  };
}
