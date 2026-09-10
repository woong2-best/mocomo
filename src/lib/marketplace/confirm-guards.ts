/** Buyer manual purchase confirm — physical goods require trusted delivery signal. */

import type { DeliverySignalSource } from "@/lib/marketplace/delivery-pipeline";

/** Sources that allow buyer-initiated confirm (capture) for physical orders. */
export const PHYSICAL_MANUAL_CONFIRM_SOURCES: DeliverySignalSource[] = [
  "17track",
  "poll",
  "admin",
];

export function orderNeedsPhysicalShipment(
  items: { listingType: string }[]
): boolean {
  return items.some((i) => i.listingType !== "DIGITAL");
}

export function isPhysicalManualConfirmSource(
  source: string | null | undefined
): source is (typeof PHYSICAL_MANUAL_CONFIRM_SOURCES)[number] {
  return (
    source != null &&
    (PHYSICAL_MANUAL_CONFIRM_SOURCES as string[]).includes(source)
  );
}

export function canBuyerManuallyConfirmOrder(order: {
  status: string;
  items: { listingType: string }[];
  shipment: {
    status: string;
    deliveredAt: Date | null;
    deliverySignalSource?: string | null;
  } | null;
}): { ok: true } | { error: string } {
  if (orderNeedsPhysicalShipment(order.items)) {
    if (order.status !== "DELIVERED") {
      return { error: "배송 완료 후에만 구매 확정할 수 있습니다." };
    }

    const delivered =
      order.shipment?.status === "DELIVERED" || order.shipment?.deliveredAt != null;
    if (!delivered) {
      return {
        error: "배송 추적상 배송 완료가 확인된 후 구매 확정할 수 있습니다.",
      };
    }

    const source = order.shipment?.deliverySignalSource;
    if (source === "fallback") {
      return {
        error: `배송 추적 자동 처리 주문은 분쟁 기간(72시간) 후 자동 구매확정됩니다.`,
      };
    }
    if (source === "manual") {
      return {
        error: "판매자 수동 배송완료 주문은 구매 확정할 수 없습니다. 고객센터에 문의해 주세요.",
      };
    }
    if (!isPhysicalManualConfirmSource(source)) {
      return {
        error: "택배사 배송완료 확인 후에만 구매 확정할 수 있습니다.",
      };
    }

    return { ok: true };
  }

  if (order.status !== "DELIVERED") {
    return { error: "확정할 수 있는 상태가 아닙니다." };
  }
  return { ok: true };
}
