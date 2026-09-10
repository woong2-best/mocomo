/** Seller shipment actions — block manual delivery claims for physical goods. */

import { orderNeedsPhysicalShipment } from "@/lib/marketplace/confirm-guards";

export function rejectSellerManualDeliveredForPhysical(
  items: { listingType: string }[],
  status: string
): { ok: true } | { error: string } {
  if (status !== "DELIVERED") return { ok: true };
  if (!orderNeedsPhysicalShipment(items)) return { ok: true };
  return {
    error:
      "실물 상품의 배송 완료는 택배 추적 확인 후 자동 처리됩니다. 송장번호와 발송 정보만 등록해 주세요.",
  };
}
