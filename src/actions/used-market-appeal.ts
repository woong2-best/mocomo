"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AppealStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { auth, requireAuth } from "@/lib/auth";
import { isUsedMarketBanned } from "@/lib/used-market-access";
import { createNotification } from "@/lib/notifications";
import { USED_MARKET_APPEAL_WINDOW_DAYS } from "@/lib/used-auction-legal";

const OPEN_APPEAL_STATUSES: AppealStatus[] = ["RECEIVED", "UNDER_REVIEW", "INFO_REQUESTED"];

const appealSchema = z.object({
  title: z.string().trim().min(1).max(100),
  content: z.string().trim().min(50).max(5000),
  contactEmail: z.string().email(),
});

export async function getUsedMarketAppealContext() {
  const session = await auth();
  if (!session?.user?.id) return { error: "로그인이 필요합니다." as const };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      usedMarketBannedAt: true,
      usedMarketBanListingId: true,
    },
  });
  if (!user) return { error: "사용자를 찾을 수 없습니다." as const };
  if (!isUsedMarketBanned(user)) {
    return { error: "현재 중고거래 이용 제한 상태가 아닙니다." as const };
  }

  const listing = user.usedMarketBanListingId
    ? await db.usedListing.findUnique({
        where: { id: user.usedMarketBanListingId },
        select: { id: true, title: true },
      })
    : null;

  const latestSanction = await db.usedMarketSanctionLog.findFirst({
    where: { userId: user.id },
    orderBy: { sanctionedAt: "desc" },
    select: { id: true, sanctionedAt: true },
  });

  const openAppeal = await db.usedMarketAppeal.findFirst({
    where: {
      userId: user.id,
      status: { in: OPEN_APPEAL_STATUSES },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, status: true, createdAt: true },
  });

  return {
    userEmail: user.email,
    banInfo: {
      bannedAt: user.usedMarketBannedAt!,
      listingId: listing?.id ?? user.usedMarketBanListingId,
      listingTitle: listing?.title ?? null,
    },
    latestSanctionId: latestSanction?.id ?? null,
    openAppeal,
    appealWindowDays: USED_MARKET_APPEAL_WINDOW_DAYS,
  };
}

export async function submitUsedMarketAppeal(data: z.infer<typeof appealSchema>) {
  const user = await requireAuth();
  const parsed = appealSchema.safeParse(data);
  if (!parsed.success) return { error: "입력값을 확인해 주세요." };

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      usedMarketBannedAt: true,
      usedMarketBanListingId: true,
    },
  });
  if (!dbUser || !isUsedMarketBanned(dbUser)) {
    return { error: "현재 중고거래 이용 제한 상태가 아닙니다." };
  }

  const existing = await db.usedMarketAppeal.findFirst({
    where: {
      userId: user.id,
      status: { in: OPEN_APPEAL_STATUSES },
    },
  });
  if (existing) return { error: "이미 검토 중인 이의 신청이 있습니다." };

  const latestSanction = await db.usedMarketSanctionLog.findFirst({
    where: { userId: user.id },
    orderBy: { sanctionedAt: "desc" },
    select: { id: true, sanctionedAt: true },
  });

  if (latestSanction) {
    const deadline =
      latestSanction.sanctionedAt.getTime() +
      USED_MARKET_APPEAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() > deadline) {
      return {
        error: `이의 신청 기한(${USED_MARKET_APPEAL_WINDOW_DAYS}일)이 지났습니다. support@mocomo.net 으로 문의해 주세요.`,
      };
    }
  }

  const appeal = await db.usedMarketAppeal.create({
    data: {
      userId: user.id,
      sanctionLogId: latestSanction?.id ?? null,
      listingId: dbUser.usedMarketBanListingId,
      title: parsed.data.title,
      content: parsed.data.content,
      contactEmail: parsed.data.contactEmail,
    },
  });

  await createNotification({
    userId: user.id,
    type: "SYSTEM",
    title: "중고거래 이의 신청 접수",
    body: "이의 신청이 정상적으로 접수되었습니다. 검토 결과를 알려드리겠습니다.",
    link: "/used/appeal",
  });

  revalidatePath("/used/appeal");
  revalidatePath("/used");
  return { success: true, appealId: appeal.id };
}
