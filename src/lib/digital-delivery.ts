import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { releaseMarketplaceEscrow } from "@/lib/marketplace/escrow";
import {
  digitalDeliveryCompleted,
  readDigitalDelivery,
  type DigitalDeliveryState,
  type DigitalDeliveryStatus,
} from "@/lib/market-tracks";

const RELEASABLE = new Set(["PAID", "PREPARING", "SHIPPED", "DELIVERED", "CONFIRMED"]);

function nextStatus(current: DigitalDeliveryStatus, action: "start" | "upload" | "approve"): DigitalDeliveryStatus | null {
  if (action === "start" && current === "held") return "progress";
  if (action === "upload" && (current === "held" || current === "progress")) return "uploaded";
  if (action === "approve" && current === "uploaded") return "completed";
  return null;
}

async function loadParty(listingId: string, userId: string) {
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: {
      id: true,
      sellerId: true,
      category: true,
      productType: true,
      subcultureMeta: true,
      title: true,
    },
  });
  if (!listing) return { error: "Listing not found." as const };
  const buyerRow = await db.usedListingChat.findFirst({
    where: { listingId, buyerId: userId },
    select: { buyerId: true },
  });
  const orderItem = await db.marketplaceOrderItem.findFirst({
    where: { usedListingId: listingId, order: { buyerId: userId } },
    select: { orderId: true },
  });
  const isSeller = listing.sellerId === userId;
  const isBuyer = !!buyerRow || !!orderItem;
  if (!isSeller && !isBuyer) return { error: "You are not part of this trade." as const };
  return { listing, isSeller, isBuyer, orderId: orderItem?.orderId ?? null };
}

async function writeDelivery(listingId: string, meta: unknown, next: DigitalDeliveryState) {
  const base =
    meta && typeof meta === "object" && !Array.isArray(meta)
      ? { ...(meta as Record<string, unknown>) }
      : {};
  base.digitalDelivery = next;
  await db.usedListing.update({
    where: { id: listingId },
    data: { subcultureMeta: base as Prisma.InputJsonValue },
  });
}

export async function mutateDigitalDelivery(
  userId: string,
  listingId: string,
  action: "start" | "upload" | "approve",
  file?: { fileUrl?: string; fileName?: string; previewUrl?: string }
): Promise<{ delivery: DigitalDeliveryState } | { error: string }> {
  const loaded = await loadParty(listingId, userId);
  if ("error" in loaded && loaded.error) return { error: loaded.error };
  const current = readDigitalDelivery(loaded.listing.subcultureMeta) ?? {
    kind: "commission" as const,
    status: "held" as const,
  };
  if (action !== "approve" && !loaded.isSeller) return { error: "Only the seller can update delivery." };
  if (action === "approve" && !loaded.isBuyer) return { error: "Only the buyer can approve the files." };
  const status = nextStatus(current.status, action);
  if (!status) return { error: "That delivery step is not available." };
  if (action === "upload" && !file?.fileUrl) return { error: "Upload a file first." };

  const next: DigitalDeliveryState = {
    ...current,
    status,
    fileUrl: file?.fileUrl || current.fileUrl,
    fileName: file?.fileName || current.fileName,
    previewUrl: file?.previewUrl || current.previewUrl,
    approvedAt: status === "completed" ? new Date().toISOString() : current.approvedAt,
  };

  if (status === "completed" && loaded.orderId) {
    const order = await db.marketplaceOrder.findUnique({ where: { id: loaded.orderId } });
    if (order && order.status !== "REFUNDED" && order.status !== "CANCELLED" && order.status !== "DISPUTED") {
      if (RELEASABLE.has(order.status) && order.status !== "CONFIRMED") {
        await db.marketplaceOrder.update({
          where: { id: order.id },
          data: { status: "CONFIRMED", confirmedAt: new Date() },
        });
      }
      const released = await releaseMarketplaceEscrow(order.id, { actorId: userId });
      if ("error" in released && order.escrowHeld && order.stripePaymentIntentId) {
        return { error: released.error };
      }
    }
  }

  await writeDelivery(listingId, loaded.listing.subcultureMeta, next);
  return { delivery: next };
}

export async function assertDigitalDisputeOpen(listingMeta: unknown): Promise<string | null> {
  if (digitalDeliveryCompleted(listingMeta)) {
    return "This digital delivery is already approved. Payment cancellation is closed.";
  }
  return null;
}
