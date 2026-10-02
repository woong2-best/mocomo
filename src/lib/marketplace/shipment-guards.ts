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
      "Physical delivery completion is processed automatically after tracking confirms delivery. Register the tracking number and shipment details only.",
  };
}
