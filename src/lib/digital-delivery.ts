import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { releaseMarketplaceEscrow } from "@/lib/marketplace/escrow";
import {
  DIGITAL_AUTO_APPROVE_MS,
  digitalDeliveryCompleted,
  readDigitalDelivery,
  type DigitalDeliveryState,
  type DigitalDeliveryStatus,
} from "@/lib/market-tracks";

const RELEASABLE = new Set(["PAID", "PREPARING", "SHIPPED", "DELIVERED", "CONFIRMED"]);

function nextStatus(current: DigitalDeliveryStatus, action: "start" | "upload" | "approve" | "dispute" | "force"): DigitalDeliveryStatus | null {
  if (action === "start" && current === "held") return "progress";
  if (action === "upload" && (current === "held" || current === "progress")) return "uploaded";
  if ((action === "approve" || action === "force") && current === "uploaded") return "completed";
  if (action === "dispute" && current === "uploaded") return "uploaded";
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
  action: "start" | "upload" | "approve" | "dispute" | "force",
  file?: { fileUrl?: string; fileName?: string; previewUrl?: string; disputeReason?: string },
  options?: { asAdmin?: boolean; auto?: boolean }
): Promise<{ delivery: DigitalDeliveryState } | { error: string }> {
  const loaded = await loadParty(listingId, userId);
  if ("error" in loaded && loaded.error) {
    if (!(options?.asAdmin && action === "force")) return { error: loaded.error };
  }
  const listing = "listing" in loaded && loaded.listing
    ? loaded.listing
    : await db.usedListing.findUnique({
        where: { id: listingId },
        select: { id: true, sellerId: true, category: true, productType: true, subcultureMeta: true, title: true },
      });
  if (!listing) return { error: "Listing not found." };
  const party = "isSeller" in loaded && loaded.listing ? loaded : null;
  const current = readDigitalDelivery(listing.subcultureMeta) ?? {
    kind: "commission" as const,
    status: "held" as const,
  };
  if (action === "force" && !options?.asAdmin) return { error: "Only an admin can force approval." };
  if (action !== "approve" && action !== "dispute" && action !== "force" && !party?.isSeller) {
    return { error: "Only the seller can update delivery." };
  }
  if ((action === "approve" || action === "dispute") && !party?.isBuyer) {
    return { error: "Only the buyer can do that." };
  }
  if (action === "approve" && current.disputed) return { error: "This delivery is in dispute." };
  const status = nextStatus(current.status, action);
  if (!status) return { error: "That delivery step is not available." };
  if (action === "upload" && !file?.fileUrl) return { error: "Upload a file first." };

  const next: DigitalDeliveryState = {
    ...current,
    status,
    fileUrl: file?.fileUrl || current.fileUrl,
    fileName: file?.fileName || current.fileName,
    previewUrl: file?.previewUrl || current.previewUrl,
    uploadedAt: status === "uploaded" ? current.uploadedAt ?? new Date().toISOString() : current.uploadedAt,
    disputed: action === "dispute" ? true : current.disputed,
    approvedAt: status === "completed" ? new Date().toISOString() : current.approvedAt,
  };

  const orderId = party && "orderId" in party ? party.orderId : null;
  if (status === "completed") {
    const item = await db.marketplaceOrderItem.findFirst({
      where: { usedListingId: listingId },
      select: { orderId: true },
    });
    const settledOrderId = orderId ?? item?.orderId ?? null;
    if (settledOrderId) {
      const order = await db.marketplaceOrder.findUnique({ where: { id: settledOrderId } });
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
  }

  await writeDelivery(listingId, listing.subcultureMeta, next);
  if (action === "dispute") {
    await db.digitalCommission.updateMany({
      where: { listingId, status: { in: ["PAID", "IN_PROGRESS", "DELIVERED", "ACCEPTED"] } },
      data: { status: "DISPUTED", disputeReason: file?.disputeReason?.slice(0, 500) || "Dispute opened" },
    });
  }
  if (status === "completed") {
    await db.digitalCommission.updateMany({
      where: { listingId, status: { not: "APPROVED" } },
      data: { status: options?.auto ? "AUTO_APPROVED" : "APPROVED" },
    });
  }
  return { delivery: next };
}

export async function maybeAutoApproveDigitalDelivery(listingId: string, actorId: string) {
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: { subcultureMeta: true, sellerId: true },
  });
  const state = readDigitalDelivery(listing?.subcultureMeta);
  if (!state || state.status !== "uploaded" || state.disputed || !state.uploadedAt) return state;
  const uploaded = new Date(state.uploadedAt).getTime();
  if (!Number.isFinite(uploaded) || Date.now() - uploaded < DIGITAL_AUTO_APPROVE_MS) return state;
  const result = await mutateDigitalDelivery(actorId, listingId, "force", undefined, { asAdmin: true, auto: true });
  return "delivery" in result ? result.delivery : state;
}

export async function assertDigitalDisputeOpen(listingMeta: unknown): Promise<string | null> {
  if (digitalDeliveryCompleted(listingMeta)) {
    return "This digital delivery is already approved. Payment cancellation is closed.";
  }
  return null;
}
