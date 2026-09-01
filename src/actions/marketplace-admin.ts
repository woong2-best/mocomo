"use server";

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
import { refreshSellerTrust } from "@/lib/marketplace/trust";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

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

  const dispute = await db.marketplaceDispute.findUnique({
    where: { id: disputeId },
    include: { order: true },
  });
  if (!dispute) return { error: "분쟁을 찾을 수 없습니다." };

  const status =
    decision === "buyer"
      ? "RESOLVED_BUYER"
      : decision === "seller"
        ? "RESOLVED_SELLER"
        : "CLOSED";

  await db.marketplaceDispute.update({
    where: { id: disputeId },
    data: {
      status,
      resolution:
        note.trim() ||
        (decision === "buyer"
          ? "구매자 승"
          : decision === "seller"
            ? "판매자 승"
            : "부분 환불"),
      resolvedAt: new Date(),
    },
  });

  if (decision === "buyer" || decision === "partial") {
    const amount =
      decision === "partial" && partialAmount && partialAmount > 0
        ? Math.min(partialAmount, dispute.order.subtotalAmount + dispute.order.shippingAmount)
        : dispute.order.subtotalAmount + dispute.order.shippingAmount;

    let stripeRefundId: string | undefined;
    if (isStripeConfigured() && dispute.order.stripePaymentIntentId) {
      try {
        const stripe = getStripe();
        let paymentIntentId = dispute.order.stripePaymentIntentId;
        if (paymentIntentId.startsWith("cs_")) {
          const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
          paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? paymentIntentId;
        }
        if (paymentIntentId.startsWith("pi_")) {
          const refunded = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount,
          });
          stripeRefundId = refunded.id;
        }
      } catch {
        /* admin can retry */
      }
    }

    await db.marketplaceRefund.create({
      data: {
        orderId: dispute.orderId,
        requesterId: dispute.openerId,
        reason: note.trim() || "분쟁 해결 환불",
        amount,
        status: stripeRefundId ? "COMPLETED" : "APPROVED",
        stripeRefundId,
        decidedAt: new Date(),
      },
    });

    await db.marketplaceOrder.update({
      where: { id: dispute.orderId },
      data: {
        status: "REFUNDED",
        settlementStatus: "REVERSED",
        escrowHeld: false,
        settlementHeldReason: "분쟁 환불",
      },
    });
    await db.marketplaceSellerProfile.updateMany({
      where: { userId: dispute.order.sellerId },
      data: { refundedOrderCount: { increment: 1 } },
    });
  } else {
    // Seller wins → confirm and release escrow
    await db.marketplaceOrder.update({
      where: { id: dispute.orderId },
      data: {
        status: "CONFIRMED",
        confirmedAt: new Date(),
        settlementStatus: "READY",
        adminReviewRequired: false,
        settlementHeldReason: null,
      },
    });
    await releaseMarketplaceEscrow(dispute.orderId, {
      actorId: admin.id,
      force: true,
    });
  }

  await logMarketplaceAudit({
    orderId: dispute.orderId,
    actorId: admin.id,
    action: MarketplaceAuditActions.DISPUTE_RESOLVE,
    detail: `${decision}: ${note.slice(0, 200)}`,
  });

  await refreshSellerTrust(dispute.order.sellerId).catch(() => null);

  await createNotification({
    userId: dispute.order.buyerId,
    type: "SYSTEM",
    title: "분쟁 처리 결과",
    body: note.trim() || status,
    link: `/market/orders/${dispute.orderId}`,
  });
  await createNotification({
    userId: dispute.order.sellerId,
    type: "SYSTEM",
    title: "분쟁 처리 결과",
    body: note.trim() || status,
    link: `/market/orders/${dispute.orderId}`,
  });

  revalidatePath("/admin/market");
  revalidatePath(`/market/orders/${dispute.orderId}`);
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
  if (!order) return { error: "주문을 찾을 수 없습니다." };

  await db.marketplaceOrder.update({
    where: { id: orderId },
    data: {
      status,
      confirmedAt: status === "CONFIRMED" ? new Date() : order.confirmedAt,
      autoConfirmAt:
        status === "DELIVERED"
          ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          : order.autoConfirmAt,
      adminReviewRequired: status === "ADMIN_REVIEW" ? true : order.adminReviewRequired,
    },
  });

  const shipStatus =
    status === "PREPARING"
      ? "PREPARING"
      : status === "SHIPPED"
        ? "IN_TRANSIT"
        : status === "DELIVERED" || status === "CONFIRMED"
          ? "DELIVERED"
          : "PREPARING";

  if (status !== "PAID" && status !== "ADMIN_REVIEW") {
    await db.marketplaceShipment.upsert({
      where: { orderId },
      create: { orderId, status: shipStatus },
      update: {
        status: shipStatus,
        ...(status === "DELIVERED" || status === "CONFIRMED"
          ? { deliveredAt: new Date() }
          : {}),
      },
    });
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
    title: "관리자가 주문 상태를 변경했습니다",
    body: status,
    link: `/market/orders/${orderId}`,
  });
  await createNotification({
    userId: order.sellerId,
    type: "SYSTEM",
    title: "관리자가 주문 상태를 변경했습니다",
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
  if (!order) return { error: "주문을 찾을 수 없습니다." };

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
    data: { settlementHeldReason: reason.trim() || "관리자 정산 보류" },
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
  if (!listing) return { error: "상품을 찾을 수 없습니다." };

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
        reason: `누적 신고 ${reportCount}건 — 자동 제재`,
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
  if (!profile) return { error: "판매자를 찾을 수 없습니다." };
  if (!profile.onboardingCompletedAt) {
    return { error: "온보딩이 완료되지 않은 판매자입니다." };
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
    title: "판매자 승인 완료",
    body: `${MARKET_BRAND_FULL} 판매자가 승인되었습니다. 이제 상품을 등록할 수 있습니다.`,
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
  if (!note) return { error: "거절 사유를 입력해 주세요." };

  const profile = await db.marketplaceSellerProfile.findUnique({ where: { id: profileId } });
  if (!profile) return { error: "판매자를 찾을 수 없습니다." };

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
    title: "판매자 승인 거절",
    body: `판매자 신청이 거절되었습니다. 사유: ${note}`,
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

/** unused export keep type available for forms */
export type AdminDisputeReason = MarketplaceDisputeReason;
