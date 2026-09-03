/**
 * Evidence-based automatic marketplace dispute rules (P3).
 * Clear signals → auto resolve; ambiguous → REVIEWING for admin.
 */

import type { MarketplaceDisputeReason } from "@prisma/client";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { logMarketplaceAudit, MarketplaceAuditActions } from "@/lib/marketplace/audit";
import {
  MARKETPLACE_AUTO_DISPUTE_MIN_BUYER_PHOTOS,
  MARKETPLACE_AUTO_DISPUTE_SELLER_RESPONSE_DAYS,
  MARKETPLACE_SHIP_DEADLINE_DAYS,
} from "@/lib/marketplace/protection-config";
import {
  executeMarketplaceDisputeResolution,
  executeNoShipAutoRefund,
} from "@/lib/marketplace/dispute-resolution";

type EvidencePayload = { urls?: string[]; note?: string; submittedAt?: string };

function photoCount(evidence: unknown): number {
  if (!evidence || typeof evidence !== "object") return 0;
  const urls = (evidence as EvidencePayload).urls;
  return Array.isArray(urls) ? urls.filter((u) => typeof u === "string" && u.trim()).length : 0;
}

const ADMIN_ONLY_REASONS = new Set<MarketplaceDisputeReason>(["COUNTERFEIT"]);

const EVIDENCE_REASONS = new Set<MarketplaceDisputeReason>([
  "DAMAGED",
  "NOT_AS_DESCRIBED",
  "MISSING_PARTS",
]);

/** Evaluate one open dispute — returns action taken or null. */
export async function evaluateMarketplaceDisputeRule(
  disputeId: string
): Promise<{ action: string } | null> {
  const dispute = await db.marketplaceDispute.findUnique({
    where: { id: disputeId },
    include: {
      order: { include: { shipment: true } },
    },
  });
  if (!dispute) return null;
  if (["RESOLVED_BUYER", "RESOLVED_SELLER", "CLOSED"].includes(dispute.status)) {
    return null;
  }

  const code = dispute.reasonCode ?? "OTHER";
  const shipment = dispute.order.shipment;

  if (ADMIN_ONLY_REASONS.has(code)) {
    if (dispute.status !== "REVIEWING") {
      await db.marketplaceDispute.update({
        where: { id: disputeId },
        data: { status: "REVIEWING" },
      });
      await logMarketplaceAudit({
        orderId: dispute.orderId,
        action: MarketplaceAuditActions.AUTO_DISPUTE,
        detail: "escalate:admin:COUNTERFEIT",
      });
    }
    return { action: "admin_review_counterfeit" };
  }

  if (code === "NOT_RECEIVED" && shipment?.status === "DELIVERED") {
    const res = await executeMarketplaceDisputeResolution({
      disputeId,
      decision: "seller",
      note: "배송 완료 추적 신호 — 미수령 주장 기각",
      autoRule: "NOT_RECEIVED_DELIVERED_PROOF",
    });
    return "error" in res ? null : { action: "seller_win_delivered" };
  }

  if (code === "NOT_RECEIVED" && shipment?.status === "IN_TRANSIT") {
    if (dispute.status !== "REVIEWING") {
      await db.marketplaceDispute.update({
        where: { id: disputeId },
        data: { status: "REVIEWING" },
      });
    }
    return { action: "admin_review_in_transit" };
  }

  if (EVIDENCE_REASONS.has(code)) {
    const buyerPhotos = photoCount(dispute.buyerEvidence);
    const sellerPhotos = photoCount(dispute.sellerEvidence);

    if (buyerPhotos < MARKETPLACE_AUTO_DISPUTE_MIN_BUYER_PHOTOS) {
      if (dispute.status === "OPEN") {
        await db.marketplaceDispute.update({
          where: { id: disputeId },
          data: { status: "REVIEWING" },
        });
        await createNotification({
          userId: dispute.order.buyerId,
          type: "SYSTEM",
          title: "분쟁 증빙 보완 필요",
          body: `사진 ${MARKETPLACE_AUTO_DISPUTE_MIN_BUYER_PHOTOS}장 이상이 필요합니다. 관리자 검토 대기 중입니다.`,
          link: `/market/orders/${dispute.orderId}`,
        });
      }
      return { action: "admin_review_insufficient_evidence" };
    }

    if (dispute.status === "OPEN") {
      await db.marketplaceDispute.update({
        where: { id: disputeId },
        data: { status: "EVIDENCE" },
      });
      await createNotification({
        userId: dispute.order.sellerId,
        type: "SYSTEM",
        title: "분쟁 반박 증빙 요청",
        body: `${MARKETPLACE_AUTO_DISPUTE_SELLER_RESPONSE_DAYS}일 내 반박 증빙을 제출하지 않으면 규칙에 따라 자동 환불될 수 있습니다.`,
        link: `/market/orders/${dispute.orderId}`,
      });
      return { action: "awaiting_seller_evidence" };
    }

    const windowMs =
      MARKETPLACE_AUTO_DISPUTE_SELLER_RESPONSE_DAYS * 24 * 60 * 60 * 1000;
    const ageMs = Date.now() - dispute.createdAt.getTime();
    if (sellerPhotos === 0 && ageMs >= windowMs) {
      const res = await executeMarketplaceDisputeResolution({
        disputeId,
        decision: "buyer",
        note: "구매자 사진 증빙 충족 · 판매자 반박 없음",
        autoRule: "EVIDENCE_BUYER_NO_SELLER_RESPONSE",
      });
      return "error" in res ? null : { action: "buyer_win_evidence" };
    }

    if (sellerPhotos > 0 && dispute.status === "EVIDENCE") {
      await db.marketplaceDispute.update({
        where: { id: disputeId },
        data: { status: "REVIEWING" },
      });
      return { action: "admin_review_both_evidence" };
    }
  }

  if (code === "SELLER_NO_RESPONSE" && dispute.status === "OPEN") {
    const windowMs =
      MARKETPLACE_AUTO_DISPUTE_SELLER_RESPONSE_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() - dispute.createdAt.getTime() >= windowMs) {
      const res = await executeMarketplaceDisputeResolution({
        disputeId,
        decision: "buyer",
        note: "판매자 무응답 기한 초과",
        autoRule: "SELLER_NO_RESPONSE_TIMEOUT",
      });
      return "error" in res ? null : { action: "buyer_win_no_response" };
    }
  }

  return null;
}

export async function processAutoDisputeRulesBatch(limit = 40): Promise<{
  evaluated: number;
  actions: Record<string, number>;
}> {
  const open = await db.marketplaceDispute.findMany({
    where: {
      status: { in: ["OPEN", "EVIDENCE"] },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });

  const actions: Record<string, number> = {};
  for (const row of open) {
    const result = await evaluateMarketplaceDisputeRule(row.id);
    if (result) {
      actions[result.action] = (actions[result.action] ?? 0) + 1;
    }
  }

  return { evaluated: open.length, actions };
}

export async function processNoShipAutoRefundBatch(limit = 30): Promise<{
  checked: number;
  refunded: number;
}> {
  const cutoff = new Date(
    Date.now() - MARKETPLACE_SHIP_DEADLINE_DAYS * 24 * 60 * 60 * 1000
  );

  const candidates = await db.marketplaceOrder.findMany({
    where: {
      status: { in: ["PAID", "PREPARING"] },
      checkoutMode: "STRIPE",
      createdAt: { lte: cutoff },
      disputes: { none: {} },
      NOT: {
        shipment: {
          is: {
            trackingNumber: { not: null },
          },
        },
      },
    },
    take: limit,
    select: { id: true },
  });

  let refunded = 0;
  for (const row of candidates) {
    const res = await executeNoShipAutoRefund(row.id);
    if ("success" in res && res.success) refunded += 1;
  }

  return { checked: candidates.length, refunded };
}
