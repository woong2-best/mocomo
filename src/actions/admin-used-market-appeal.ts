"use server";

import { revalidatePath } from "next/cache";
import type { AppealStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { createNotification } from "@/lib/notifications";

const OPEN_APPEAL_STATUSES: AppealStatus[] = ["RECEIVED", "UNDER_REVIEW", "INFO_REQUESTED"];

export type UsedMarketAppealStatusFilter = AppealStatus | "OPEN" | "ALL";

export async function getAdminUsedMarketAppeals(filter: UsedMarketAppealStatusFilter = "OPEN") {
  await requireAdmin({ action: "used_market_appeals_list", metadata: { filter } });

  const where =
    filter === "ALL"
      ? undefined
      : filter === "OPEN"
        ? { status: { in: OPEN_APPEAL_STATUSES } }
        : { status: filter };

  return db.usedMarketAppeal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          usedMarketBannedAt: true,
          usedMarketBanListingId: true,
          auctionPaymentDefaultCount: true,
          auctionWinCount: true,
        },
      },
      listing: {
        select: {
          id: true,
          title: true,
          saleType: true,
          auctionState: true,
          auctionEndsAt: true,
          paymentDueAt: true,
          currentBidAmount: true,
        },
      },
      sanctionLog: {
        select: {
          id: true,
          reason: true,
          sanctionedAt: true,
          retainUntil: true,
          winningBidAmount: true,
        },
      },
      admin: { select: { username: true } },
    },
  });
}

export async function getUsedMarketAppealDetail(appealId: string) {
  await requireAdmin({
    action: "used_market_appeal_view",
    targetType: "UsedMarketAppeal",
    targetId: appealId,
  });

  const appeal = await db.usedMarketAppeal.findUnique({
    where: { id: appealId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          usedMarketBannedAt: true,
          usedMarketBanReason: true,
          usedMarketBanListingId: true,
          auctionPaymentDefaultCount: true,
          auctionWinCount: true,
          auctionLastPaymentDefaultAt: true,
        },
      },
      listing: {
        select: {
          id: true,
          title: true,
          saleType: true,
          auctionState: true,
          auctionEndsAt: true,
          paymentDueAt: true,
          paymentCompletedAt: true,
          currentBidAmount: true,
          price: true,
          bidCount: true,
          winningBidderId: true,
          sellerId: true,
        },
      },
      sanctionLog: true,
      admin: { select: { username: true } },
    },
  });
  if (!appeal) return { error: "actions.s1uyjy12" as const };

  const [sanctionLogs, bids] = await Promise.all([
    db.usedMarketSanctionLog.findMany({
      where: { userId: appeal.userId },
      orderBy: { sanctionedAt: "desc" },
      take: 20,
      include: {
        listing: { select: { id: true, title: true } },
      },
    }),
    appeal.listingId
      ? db.usedAuctionBid.findMany({
          where: { listingId: appeal.listingId },
          orderBy: [{ amount: "desc" }, { createdAt: "desc" }],
          take: 50,
          include: {
            bidder: { select: { id: true, username: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  return { appeal, sanctionLogs, bids };
}

const APPEAL_STATUS_MESSAGES: Partial<Record<AppealStatus, { title: string; body: string }>> = {
  UNDER_REVIEW: {
    title: t("actions.s1f30pbl"),
    body: t("actions.spxp91j"),
  },
  INFO_REQUESTED: {
    title: t("actions.s1sloj1x"),
    body: t("actions.s1fhlh87"),
  },
  APPROVED: {
    title: t("actions.shcnxfj"),
    body: t("actions.s13e0y7n"),
  },
  REJECTED: {
    title: t("actions.shcka9d"),
    body: t("actions.sw6240p"),
  },
  CLOSED: {
    title: t("actions.shcou13"),
    body: t("actions.s12oocmp"),
  },
};

export async function updateUsedMarketAppealStatus(
  appealId: string,
  status: AppealStatus,
  decisionNote?: string
) {
  const admin = await requireAdmin({
    action: "used_market_appeal_decide",
    targetType: "UsedMarketAppeal",
    targetId: appealId,
    metadata: { status },
  });

  const appeal = await db.usedMarketAppeal.findUnique({
    where: { id: appealId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          usedMarketBannedAt: true,
        },
      },
    },
  });
  if (!appeal) return { error: "actions.s1uyjy12" };

  const note = decisionNote?.trim() || undefined;
  const decided = status === "APPROVED" || status === "REJECTED" || status === "CLOSED";

  await db.usedMarketAppeal.update({
    where: { id: appealId },
    data: {
      status,
      adminId: admin.id,
      adminNotes: note,
      decisionNote: decided ? note : undefined,
      decidedAt: decided ? new Date() : undefined,
    },
  });

  if (status === "APPROVED" && appeal.user.usedMarketBannedAt) {
    await db.user.update({
      where: { id: appeal.userId },
      data: {
        usedMarketBannedAt: null,
        usedMarketBanReason: null,
        usedMarketBanListingId: null,
      },
    });
    await db.modLog.create({
      data: {
        actorId: admin.id,
        targetId: appeal.userId,
        action: "used_market_unban",
        reason: note ?? t("actions.suu31vt", { v0: appealId }),
      },
    });
  }

  const msg = APPEAL_STATUS_MESSAGES[status];
  if (msg) {
    const body = note ? t("actions.n_n", { v0: msg.body, v1: note }) : msg.body;
    await createNotification({
      userId: appeal.userId,
      type: "SYSTEM",
      title: msg.title,
      body,
      link: "/market/appeal",
    });
  }

  revalidatePath("/admin/used-market");
  revalidatePath("/market/appeal");
  revalidatePath("/market");
  return { success: true };
}
