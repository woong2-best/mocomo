"use server";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");
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
  if (!session?.user?.id) return { error: "actions.s1mzxopt" as const };

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      usedMarketBannedAt: true,
      usedMarketBanListingId: true,
    },
  });
  if (!user) return { error: "actions.svypth4" as const };
  if (!isUsedMarketBanned(user)) {
    return { error: "actions.s444f0c" as const };
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
  if (!parsed.success) return { error: "actions.slqeo1f" };

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      usedMarketBannedAt: true,
      usedMarketBanListingId: true,
    },
  });
  if (!dbUser || !isUsedMarketBanned(dbUser)) {
    return { error: "actions.s444f0c" };
  }

  const existing = await db.usedMarketAppeal.findFirst({
    where: {
      userId: user.id,
      status: { in: OPEN_APPEAL_STATUSES },
    },
  });
  if (existing) return { error: "actions.s1acx4hx" };

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
        error: t("actions.support_mocomo_net", { v0: USED_MARKET_APPEAL_WINDOW_DAYS }),
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
    title: "actions.shcot3b",
    body: "actions.s1f6t8vl",
    link: "/market/appeal",
  });

  revalidatePath("/market/appeal");
  revalidatePath("/market");
  return { success: true, appealId: appeal.id };
}
