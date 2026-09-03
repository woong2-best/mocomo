/**
 * Delivery → dispute window → auto-confirm pipeline for Star Market physical orders.
 */

import type { MarketplaceShipmentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { logMarketplaceAudit, MarketplaceAuditActions } from "@/lib/marketplace/audit";
import {
  MARKETPLACE_DELIVERY_FALLBACK_DAYS,
  MARKETPLACE_DISPUTE_WINDOW_HOURS,
} from "@/lib/marketplace/protection-config";

export type DeliverySignalSource = "17track" | "manual" | "fallback" | "poll";

const TERMINAL_ORDER_STATUSES = new Set([
  "CONFIRMED",
  "SETTLED",
  "REFUNDED",
  "CANCELLED",
  "DISPUTED",
  "REFUND_REQUESTED",
]);

export function marketplaceAutoConfirmAtFromDelivery(now = Date.now()): Date {
  return new Date(now + MARKETPLACE_DISPUTE_WINDOW_HOURS * 60 * 60 * 1000);
}

export function map17TrackStatusToShipmentStatus(mainStatus: string): MarketplaceShipmentStatus | null {
  const s = mainStatus.trim();
  if (s === "Delivered") return "DELIVERED";
  if (s === "OutForDelivery" || s === "InTransit" || s === "AvailableForPickup") return "IN_TRANSIT";
  if (s === "InfoReceived" || s === "PickedUp") return "SHIPPED";
  if (s === "DeliveryFailure" || s === "Exception" || s === "Expired") return "IN_TRANSIT";
  return null;
}

export function is17TrackDelivered(mainStatus: string, subStatus?: string | null): boolean {
  if (mainStatus === "Delivered") return true;
  if (subStatus?.startsWith("Delivered")) return true;
  return false;
}

/** Mark order delivered and start buyer dispute window before auto-confirm/capture. */
export async function markMarketplaceOrderDelivered(input: {
  orderId: string;
  source: DeliverySignalSource;
  deliveredAt?: Date;
  actorId?: string | null;
}): Promise<{ ok: true; alreadyDelivered?: boolean } | { error: string }> {
  const order = await db.marketplaceOrder.findUnique({
    where: { id: input.orderId },
    include: { shipment: true },
  });
  if (!order) return { error: "주문을 찾을 수 없습니다." };
  if (TERMINAL_ORDER_STATUSES.has(order.status)) {
    return { error: "이 주문은 배송 완료 처리할 수 없습니다." };
  }
  if (order.status === "DELIVERED" && order.autoConfirmAt) {
    return { ok: true, alreadyDelivered: true };
  }

  const deliveredAt = input.deliveredAt ?? new Date();
  const autoConfirmAt = marketplaceAutoConfirmAtFromDelivery(deliveredAt.getTime());

  await db.marketplaceShipment.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      status: "DELIVERED",
      deliveredAt,
      shippedAt: deliveredAt,
    },
    update: {
      status: "DELIVERED",
      deliveredAt,
    },
  });

  await db.marketplaceOrder.update({
    where: { id: order.id },
    data: {
      status: "DELIVERED",
      autoConfirmAt,
    },
  });

  await logMarketplaceAudit({
    orderId: order.id,
    actorId: input.actorId ?? null,
    action: MarketplaceAuditActions.SHIPMENT_STATUS,
    detail: `delivered:${input.source}`,
    metadata: { autoConfirmAt: autoConfirmAt.toISOString() },
  });

  if (!input.actorId) {
    await createNotification({
      userId: order.buyerId,
      type: "SYSTEM",
      title: "배송이 완료되었습니다",
      body:
        input.source === "fallback"
          ? `배송 추적 신호가 없어 ${MARKETPLACE_DELIVERY_FALLBACK_DAYS}일 후 자동 배송완료 처리되었습니다. ${MARKETPLACE_DISPUTE_WINDOW_HOURS}시간 내 이의제기 가능합니다.`
          : `수령 후 ${MARKETPLACE_DISPUTE_WINDOW_HOURS}시간 내 이의제기할 수 있습니다. 이후 자동 구매확정됩니다.`,
      link: `/market/orders/${order.id}`,
    });
  }

  return { ok: true };
}

/** Apply 17TRACK (or poll) tracking status — delivery triggers dispute window. */
export async function applyMarketplaceTrackingUpdate(input: {
  trackingNumber: string;
  orderTag?: string | null;
  mainStatus: string;
  subStatus?: string | null;
  source: DeliverySignalSource;
}): Promise<{ ok: true; delivered: boolean } | { error: string } | null> {
  const trackingNumber = input.trackingNumber.trim();
  if (!trackingNumber) return null;

  let shipment = input.orderTag
    ? await db.marketplaceShipment.findFirst({
        where: { orderId: input.orderTag, trackingNumber },
        select: { orderId: true, status: true },
      })
    : null;

  if (!shipment) {
    shipment = await db.marketplaceShipment.findFirst({
      where: { trackingNumber },
      orderBy: { updatedAt: "desc" },
      select: { orderId: true, status: true },
    });
  }

  if (!shipment) return null;

  const mapped = map17TrackStatusToShipmentStatus(input.mainStatus);
  if (mapped && mapped !== "DELIVERED" && shipment.status !== "DELIVERED") {
    await db.marketplaceShipment.update({
      where: { orderId: shipment.orderId },
      data: { status: mapped },
    });
    const order = await db.marketplaceOrder.findUnique({
      where: { id: shipment.orderId },
      select: { status: true },
    });
    if (order && (order.status === "PAID" || order.status === "PREPARING")) {
      await db.marketplaceOrder.update({
        where: { id: shipment.orderId },
        data: { status: mapped === "IN_TRANSIT" ? "SHIPPED" : "SHIPPED" },
      });
    }
  }

  if (!is17TrackDelivered(input.mainStatus, input.subStatus)) {
    return { ok: true, delivered: false };
  }

  const res = await markMarketplaceOrderDelivered({
    orderId: shipment.orderId,
    source: input.source,
  });
  if ("error" in res) return res;
  return { ok: true, delivered: true };
}

/** Shipped N days ago with no delivery webhook → synthetic delivered + dispute window. */
export async function applyDeliveryFallbackBatch(limit = 50) {
  const cutoff = new Date(Date.now() - MARKETPLACE_DELIVERY_FALLBACK_DAYS * 24 * 60 * 60 * 1000);
  const candidates = await db.marketplaceOrder.findMany({
    where: {
      status: "SHIPPED",
      shipment: {
        is: {
          shippedAt: { lte: cutoff },
          status: { not: "DELIVERED" },
          trackingNumber: { not: null },
        },
      },
    },
    take: limit,
    select: { id: true },
  });

  let delivered = 0;
  for (const row of candidates) {
    const res = await markMarketplaceOrderDelivered({
      orderId: row.id,
      source: "fallback",
    });
    if ("ok" in res && res.ok) delivered += 1;
  }
  return { checked: candidates.length, delivered };
}
