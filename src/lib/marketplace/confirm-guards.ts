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
      return { error: "You can confirm purchase only after delivery is complete." };
    }

    const delivered =
      order.shipment?.status === "DELIVERED" || order.shipment?.deliveredAt != null;
    if (!delivered) {
      return {
        error: "Confirm purchase only after tracking shows delivery complete.",
      };
    }

    const source = order.shipment?.deliverySignalSource;
    if (source === "fallback") {
      return {
        error: `Tracked orders auto-confirm after the dispute window (72 hours).`,
      };
    }
    if (source === "manual") {
      return {
        error: "Seller-marked delivered orders cannot be confirmed here. Contact support.",
      };
    }
    if (!isPhysicalManualConfirmSource(source)) {
      return {
        error: "Confirm purchase only after the carrier marks delivery complete.",
      };
    }

    return { ok: true };
  }

  if (order.status !== "DELIVERED") {
    return { error: "Cannot confirm in the current status." };
  }
  return { ok: true };
}
