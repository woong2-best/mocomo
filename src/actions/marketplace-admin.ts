"use server";


import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");
import { revalidatePath } from "next/cache";
import type {
  MarketplaceDisputeReason,
  MarketplaceOrderStatus,
  MarketplaceReportReason,
  MarketplaceSanctionLevel,
} from "@prisma/client";
import { requireAdmin, requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { logMarketplaceAudit, MarketplaceAuditActions } from "@/lib/marketplace/audit";
import { MARKET_BRAND_FULL } from "@/lib/market-brand";
import {
  releaseMarketplaceEscrow,
  holdSettlementForDispute,
} from "@/lib/marketplace/escrow";
import { applyMarketplaceSanction, clearMarketplaceSanction } from "@/lib/marketplace/sanctions";
import { MARKETPLACE_REPORT_ESCALATE_COUNT } from "@/lib/marketplace/protection-config";
import { executeMarketplaceDisputeResolution } from "@/lib/marketplace/dispute-resolution";
import { markMarketplaceOrderDelivered } from "@/lib/marketplace/delivery-pipeline";
import {
  formatTradeLegalRecordExport,
  refreshTradeLegalRecord,
} from "@/lib/marketplace/trade-legal-record";

export async function resolveMarketplaceDispute(
  disputeId: string,
  decision: "buyer" | "seller" | "partial",
  note: string,
  partialAmount?: number
) {
  const admin = await requireAdmin({
    action: "MARKETPLACE_DISPUTE_RESOLVE",
    targetType: "marketplace_dispute",
    targetId: disputeId,
  });

  const result = await executeMarketplaceDisputeResolution({
    disputeId,
    decision,
    note,
    partialAmount,
    actorId: admin.id,
  });
  if ("error" in result) return result;

  revalidatePath("/admin/market");
  const disputeRow = await db.marketplaceDispute.findUnique({
    where: { id: disputeId },
    select: { orderId: true },
  });
  if (disputeRow) revalidatePath(`/market/orders/${disputeRow.orderId}`);
  return { success: true };
}

export async function adminSetMarketplaceOrderStatus(
  orderId: string,
  status: Extract<
    MarketplaceOrderStatus,
    "PAID" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CONFIRMED" | "ADMIN_REVIEW"
  >
) {
  const admin = await requireAdmin({
    action: "MARKETPLACE_ADMIN_VIEW",
    targetType: "marketplace_order",
    targetId: orderId,
  });

  const order = await db.marketplaceOrder.findUnique({ where: { id: orderId } });
  if (!order) return { error: "actions.sr119vd" };

  if (status === "DELIVERED") {
    const delivered = await markMarketplaceOrderDelivered({
      orderId,
      source: "admin",
      actorId: admin.id,
    });
    if ("error" in delivered) return delivered;
  } else {
    await db.marketplaceOrder.update({
      where: { id: orderId },
      data: {
        status,
        confirmedAt: status === "CONFIRMED" ? new Date() : order.confirmedAt,
        adminReviewRequired: status === "ADMIN_REVIEW" ? true : order.adminReviewRequired,
      },
    });

    const shipStatus =
      status === "PREPARING"
        ? "PREPARING"
        : status === "SHIPPED"
          ? "IN_TRANSIT"
          : status === "CONFIRMED"
            ? "DELIVERED"
            : "PREPARING";

    if (status !== "PAID" && status !== "ADMIN_REVIEW") {
      await db.marketplaceShipment.upsert({
        where: { orderId },
        create: { orderId, status: shipStatus },
        update: {
          status: shipStatus,
          ...(status === "CONFIRMED" ? { deliveredAt: new Date(), deliverySignalSource: "admin" } : {}),
        },
      });
    }
  }

  if (status === "CONFIRMED") {
    await releaseMarketplaceEscrow(orderId, { actorId: admin.id });
  }

  await logMarketplaceAudit({
    orderId,
    actorId: admin.id,
    action: MarketplaceAuditActions.ADMIN_ACTION,
    detail: `status→${status}`,
  });

  await createNotification({
    userId: order.buyerId,
    type: "SYSTEM",
    title: "actions.s159g2it",
    body: status,
    link: `/market/orders/${orderId}`,
  });
  await createNotification({
    userId: order.sellerId,
    type: "SYSTEM",
    title: "actions.s159g2it",
    body: status,
    link: `/market/orders/${orderId}`,
  });

  revalidatePath("/admin/market");
  revalidatePath(`/market/orders/${orderId}`);
  return { success: true };
}

export async function adminClearMarketplaceReview(orderId: string) {
  const admin = await requireAdmin({
    action: "MARKETPLACE_ADMIN_VIEW",
    targetType: "marketplace_order",
    targetId: orderId,
  });
  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) return { error: "actions.sr119vd" };

  const needsShip = order.items.some((i) => i.listingType !== "DIGITAL");
  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: {
      adminReviewRequired: false,
      settlementHeldReason: null,
      settlementStatus: "PENDING",
      status: needsShip ? "PREPARING" : "DELIVERED",
      autoConfirmAt: needsShip
        ? null
        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });
  if (needsShip) {
    await db.marketplaceShipment.upsert({
      where: { orderId },
      create: { orderId, status: "PREPARING" },
      update: {},
    });
  }

  await logMarketplaceAudit({
    orderId,
    actorId: admin.id,
    action: MarketplaceAuditActions.ADMIN_ACTION,
    detail: "clear_admin_review",
  });

  revalidatePath("/admin/market");
  revalidatePath(`/market/orders/${orderId}`);
  return { success: true };
}

export async function adminReleaseMarketplaceSettlement(orderId: string) {
  const admin = await requireAdmin({
    action: "MARKETPLACE_DISPUTE_RESOLVE",
    targetType: "marketplace_order",
    targetId: orderId,
  });
  const res = await releaseMarketplaceEscrow(orderId, {
    actorId: admin.id,
    force: true,
  });
  revalidatePath("/admin/market");
  revalidatePath(`/market/orders/${orderId}`);
  return res;
}

export async function adminHoldMarketplaceSettlement(orderId: string, reason: string) {
  const admin = await requireAdmin({
    action: "MARKETPLACE_ADMIN_VIEW",
    targetType: "marketplace_order",
    targetId: orderId,
  });
  await holdSettlementForDispute(orderId, admin.id);
  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: { settlementHeldReason: reason.trim() || "actions.s46vrjh" },
  });
  await logMarketplaceAudit({
    orderId,
    actorId: admin.id,
    action: MarketplaceAuditActions.SETTLEMENT_BLOCKED,
    detail: reason,
  });
  revalidatePath("/admin/market");
  return { success: true };
}

export async function adminSanctionMarketplaceSeller(input: {
  sellerProfileId: string;
  level?: MarketplaceSanctionLevel;
  escalate?: boolean;
  reason: string;
}) {
  const admin = await requireAdmin({
    action: "MARKETPLACE_DISPUTE_RESOLVE",
    targetType: "marketplace_seller",
    targetId: input.sellerProfileId,
  });
  const res = await applyMarketplaceSanction({
    ...input,
    actorId: admin.id,
  });
  revalidatePath("/admin/market");
  return res;
}

export async function adminClearMarketplaceSellerSanction(sellerProfileId: string) {
  const admin = await requireAdmin({
    action: "MARKETPLACE_DISPUTE_RESOLVE",
    targetType: "marketplace_seller",
    targetId: sellerProfileId,
  });
  await clearMarketplaceSanction(sellerProfileId, admin.id);
  revalidatePath("/admin/market");
  return { success: true };
}

export async function reportMarketplaceListing(input: {
  listingId: string;
  reason: MarketplaceReportReason;
  details?: string;
}) {
  const user = await requireAuth();
  const listing = await db.marketplaceListing.findUnique({
    where: { id: input.listingId },
    select: { id: true, sellerId: true, sellerProfileId: true },
  });
  if (!listing) return { error: "actions.s1fhot7o" };

  const profile =
    listing.sellerProfileId
      ? await db.marketplaceSellerProfile.findUnique({ where: { id: listing.sellerProfileId } })
      : await db.marketplaceSellerProfile.findUnique({ where: { userId: listing.sellerId } });

  await db.marketplaceReport.create({
    data: {
      reporterId: user.id,
      reason: input.reason,
      details: input.details?.trim() || null,
      listingId: listing.id,
      sellerProfileId: profile?.id,
      sellerUserId: listing.sellerId,
    },
  });

  let reportCount = profile?.reportCount ?? 0;
  if (profile) {
    const updated = await db.marketplaceSellerProfile.update({
      where: { id: profile.id },
      data: { reportCount: { increment: 1 } },
    });
    reportCount = updated.reportCount;
    if (reportCount >= MARKETPLACE_REPORT_ESCALATE_COUNT) {
      await applyMarketplaceSanction({
        sellerProfileId: profile.id,
        escalate: true,
        reason: t("actions.so53jua", { v0: reportCount }),
        actorId: null,
      });
    }
  }

  await logMarketplaceAudit({
    actorId: user.id,
    action: MarketplaceAuditActions.REPORT,
    detail: `${input.reason} listing=${listing.id}`,
    metadata: { listingId: listing.id, reason: input.reason },
  });

  revalidatePath(`/market/i/${listing.id}`);
  revalidatePath("/admin/market");
  return { success: true, reportCount };
}

export async function getAdminMarketplaceDisputeCenter() {
  await requireAdmin({ action: "MARKETPLACE_ADMIN_VIEW" });

  const [disputes, reviewOrders, reports, recentAudit] = await Promise.all([
    db.marketplaceDispute.findMany({
      where: { status: { in: ["OPEN", "EVIDENCE", "REVIEWING"] } },
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        opener: { select: { username: true } },
        order: {
          include: {
            buyer: { select: { username: true } },
            seller: { select: { username: true } },
            shipment: true,
            items: { take: 3 },
            refunds: { take: 3 },
            sellerProfile: true,
          },
        },
      },
    }),
    db.marketplaceOrder.findMany({
      where: {
        OR: [{ adminReviewRequired: true }, { status: "ADMIN_REVIEW" }, { settlementStatus: "BLOCKED" }],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        buyer: { select: { username: true } },
        seller: { select: { username: true } },
        items: { take: 1 },
        shipment: true,
      },
    }),
    db.marketplaceReport.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.marketplaceAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  return { disputes, reviewOrders, reports, recentAudit };
}

export async function listPendingMarketplaceSellers() {
  await requireAdmin({ action: "MARKETPLACE_SELLER_REVIEW_LIST" });
  return db.marketplaceSellerProfile.findMany({
    where: {
      onboardingCompletedAt: { not: null },
      status: "PENDING",
    },
    orderBy: { onboardingCompletedAt: "desc" },
    take: 50,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
          countryCode: true,
          phone: true,
          phoneVerified: true,
          stripeConnectAccountId: true,
          stripeConnectOnboardedAt: true,
        },
      },
    },
  });
}

/** 예외 검수 — 자동 KYC·정산 플래그 건 승인 → 상품 등록 가능 */
export async function approveMarketplaceSeller(profileId: string) {
  const admin = await requireAdmin({
    action: "MARKETPLACE_SELLER_APPROVE",
    targetType: "marketplace_seller",
    targetId: profileId,
  });

  const profile = await db.marketplaceSellerProfile.findUnique({ where: { id: profileId } });
  if (!profile) return { error: "actions.s1iqcuip" };
  if (!profile.onboardingCompletedAt) {
    return { error: "actions.si33ydi" };
  }

  const now = new Date();
  await db.marketplaceSellerProfile.update({
    where: { id: profileId },
    data: {
      status: "APPROVED",
      canList: true,
      reviewedAt: now,
      reviewedById: admin.id,
    },
  });

  await createNotification({
    userId: profile.userId,
    type: "system",
    title: "actions.s1to4sud",
    body: t("actions.s1woj4y6", { v0: MARKET_BRAND_FULL }),
    link: "/market/seller",
  }).catch(() => null);

  await logMarketplaceAudit({
    actorId: admin.id,
    action: MarketplaceAuditActions.ADMIN_ACTION,
    detail: `seller_approved profile=${profileId}`,
    metadata: { profileId },
  });

  revalidatePath("/admin/market");
  revalidatePath("/market/seller");
  return { success: true as const };
}

export async function rejectMarketplaceSeller(profileId: string, reason: string) {
  const admin = await requireAdmin({
    action: "MARKETPLACE_SELLER_REJECT",
    targetType: "marketplace_seller",
    targetId: profileId,
  });

  const note = reason.trim().slice(0, 500);
  if (!note) return { error: "actions.soypale" };

  const profile = await db.marketplaceSellerProfile.findUnique({ where: { id: profileId } });
  if (!profile) return { error: "actions.s1iqcuip" };

  const now = new Date();
  await db.marketplaceSellerProfile.update({
    where: { id: profileId },
    data: {
      status: "REJECTED",
      canList: false,
      kycStatus: "FAILED",
      kycNotes: note,
      reviewedAt: now,
      reviewedById: admin.id,
    },
  });

  await createNotification({
    userId: profile.userId,
    type: "system",
    title: "actions.s1to0hp1",
    body: t("actions.s9fi288", { v0: note }),
    link: "/market/seller/register",
  }).catch(() => null);

  await logMarketplaceAudit({
    actorId: admin.id,
    action: MarketplaceAuditActions.ADMIN_ACTION,
    detail: `seller_rejected profile=${profileId}`,
    metadata: { profileId, reason: note },
  });

  revalidatePath("/admin/market");
  revalidatePath("/market/seller");
  return { success: true as const };
}

/** Law-enforcement / victim evidence package (text). */
export async function exportMarketplaceDisputeLegalBundle(disputeId: string) {
  await requireAdmin({
    action: "MARKETPLACE_DISPUTE_EXPORT",
    targetType: "marketplace_dispute",
    targetId: disputeId,
  });

  const dispute = await db.marketplaceDispute.findUnique({
    where: { id: disputeId },
    include: { order: { select: { id: true, tradeLegalRecord: true } } },
  });
  if (!dispute) return { error: "actions.s1hvx3ui" };

  if (!dispute.tradeEvidenceSnapshot) {
    await refreshTradeLegalRecord(dispute.orderId);
    const legalRecord = dispute.order.tradeLegalRecord;
    const snapshot = {
      legalRecord,
      note: "Snapshot backfilled at export time",
      disputeOpenedAt: dispute.createdAt.toISOString(),
    };
    await db.marketplaceDispute.update({
      where: { id: disputeId },
      data: { tradeEvidenceSnapshot: snapshot },
    });
    dispute.tradeEvidenceSnapshot = snapshot;
  }

  const body = formatTradeLegalRecordExport(
    {
      id: dispute.id,
      reasonCode: dispute.reasonCode,
      reason: dispute.reason,
      createdAt: dispute.createdAt,
      status: dispute.status,
      tradeEvidenceSnapshot: dispute.tradeEvidenceSnapshot,
    },
    dispute.orderId
  );

  return {
    success: true as const,
    filename: `mocomo-dispute-${dispute.orderId}-${dispute.id}.txt`,
    body,
  };
}

/** unused export keep type available for forms */
export type AdminDisputeReason = MarketplaceDisputeReason;
