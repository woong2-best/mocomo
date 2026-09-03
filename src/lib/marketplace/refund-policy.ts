/**
 * 마켓플레이스 환불·분쟁 정책 (Stripe 전용)
 *
 * - 발송 전(PAID/PREPARING): 전액 환불
 * - 발송 후(SHIPPED+): 반품 정책 — 기본 전액, 배송비 차감 옵션
 * - 차지백 방어: 유효 송장(tracking) 필수
 */

import type { MarketplaceOrder, MarketplaceShipment } from "@prisma/client";

export type RefundPolicyPhase = "PRE_SHIP" | "POST_SHIP" | "NOT_REFUNDABLE";

export type RefundQuote = {
  phase: RefundPolicyPhase;
  /** 환불 가능 금액 (USD cents) */
  refundAmount: number;
  /** 원 주문 총액 */
  orderTotal: number;
  shippingDeduction: number;
  policyLabel: string;
  policyLabelEn: string;
};

export function orderRefundPhase(
  status: MarketplaceOrder["status"],
  shipment: Pick<MarketplaceShipment, "status" | "trackingNumber" | "shippedAt"> | null
): RefundPolicyPhase {
  if (["CANCELLED", "REFUNDED", "SETTLED", "CONFIRMED"].includes(status)) {
    return "NOT_REFUNDABLE";
  }
  if (["PAID", "PREPARING", "ADMIN_REVIEW"].includes(status)) {
    return "PRE_SHIP";
  }
  if (["SHIPPED", "DELIVERED", "REFUND_REQUESTED", "DISPUTED"].includes(status)) {
    if (shipment?.trackingNumber?.trim()) return "POST_SHIP";
    return "POST_SHIP";
  }
  return "NOT_REFUNDABLE";
}

export function computeRefundQuote(input: {
  order: Pick<MarketplaceOrder, "status" | "subtotalAmount" | "shippingAmount">;
  shipment: Pick<MarketplaceShipment, "status" | "trackingNumber" | "shippedAt"> | null;
  deductReturnShipping?: boolean;
}): RefundQuote {
  const orderTotal = input.order.subtotalAmount + input.order.shippingAmount;
  const phase = orderRefundPhase(input.order.status, input.shipment);

  if (phase === "NOT_REFUNDABLE") {
    return {
      phase,
      refundAmount: 0,
      orderTotal,
      shippingDeduction: 0,
      policyLabel: "현재 상태에서는 환불할 수 없습니다.",
      policyLabelEn: "Refund is not available in the current order state.",
    };
  }

  if (phase === "PRE_SHIP") {
    return {
      phase,
      refundAmount: orderTotal,
      orderTotal,
      shippingDeduction: 0,
      policyLabel: "발송 전 취소 — 전액 환불 (Stripe)",
      policyLabelEn: "Pre-shipment cancellation — full refund via Stripe",
    };
  }

  const shippingDeduction =
    input.deductReturnShipping && input.order.shippingAmount > 0
      ? input.order.shippingAmount
      : 0;
  const refundAmount = Math.max(0, orderTotal - shippingDeduction);

  return {
    phase: "POST_SHIP",
    refundAmount,
    orderTotal,
    shippingDeduction,
    policyLabel:
      shippingDeduction > 0
        ? `발송 후 반품 — 배송비 ${shippingDeduction} 차감 후 환불`
        : "발송 후 반품 — 전액 환불 (판매자 승인 필요)",
    policyLabelEn:
      shippingDeduction > 0
        ? "Post-shipment return — refund minus return shipping"
        : "Post-shipment return — full refund (seller approval required)",
  };
}

/** 차지백 방어 — 발송 시 유효 송장 필수 */
export function assertShipmentTrackingForSeller(input: {
  trackingNumber?: string | null;
  carrierCode?: string | null;
}): { ok: true } | { error: string } {
  const tracking = input.trackingNumber?.trim();
  if (!tracking || tracking.length < 4) {
    return {
      error:
        "차지백·분쟁 대응을 위해 유효한 송장(트래킹) 번호가 필요합니다.",
    };
  }
  return { ok: true };
}

export const MARKET_MEDIATOR_NOTICE_KO =
  "MoCoMo는 기술 중개 플랫폼이며 직배송·물류 사업자가 아닙니다. 배송·파손·분실 책임은 판매자와 배송사에 있습니다.";

export const MARKET_MEDIATOR_NOTICE_EN =
  "MoCoMo is a technology mediator, not a carrier. Shipping, damage, and loss liability rest with the seller and the carrier.";
