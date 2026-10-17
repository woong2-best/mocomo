"use server";

import { auth, requireAdmin, requireAuth } from "@/lib/auth";
import { maybeAutoApproveDigitalDelivery, mutateDigitalDelivery } from "@/lib/digital-delivery";
import { publicDigitalDelivery, readDigitalDelivery, isDigitalListing } from "@/lib/market-tracks";
import { db } from "@/lib/db";

export async function updateDigitalDelivery(input: {
  listingId: string;
  action: "start" | "upload" | "approve" | "dispute";
  fileUrl?: string;
  fileName?: string;
  previewUrl?: string;
  disputeReason?: string;
}) {
  const user = await requireAuth();
  return mutateDigitalDelivery(user.id, input.listingId, input.action, {
    fileUrl: input.fileUrl,
    fileName: input.fileName,
    previewUrl: input.previewUrl,
    disputeReason: input.disputeReason,
  });
}

export async function forceApproveDigitalDelivery(listingId: string) {
  const admin = await requireAdmin({ action: "digital_delivery.force_approve", targetId: listingId });
  return mutateDigitalDelivery(admin.id, listingId, "force", undefined, { asAdmin: true });
}

export async function getDigitalDelivery(listingId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { delivery: null, role: "other" as const, digital: false };
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: { sellerId: true, subcultureMeta: true, category: true, productType: true },
  });
  if (!listing) return { delivery: null, role: "other" as const, digital: false };
  const digital = isDigitalListing(listing);
  const state = readDigitalDelivery(listing.subcultureMeta) ?? (digital ? { kind: "commission" as const, status: "held" as const } : null);
  const buyerChat = await db.usedListingChat.findFirst({
    where: { listingId, buyerId: userId },
    select: { id: true },
  });
  const orderItem = await db.marketplaceOrderItem.findFirst({
    where: { usedListingId: listingId, order: { buyerId: userId } },
    select: { id: true },
  });
  const role = listing.sellerId === userId ? "seller" : buyerChat || orderItem ? "buyer" : "other";
  const refreshed = digital ? await maybeAutoApproveDigitalDelivery(listingId, userId) : state;
  const view = publicDigitalDelivery(refreshed ?? state, role === "seller" ? "seller" : "buyer");
  return {
    delivery: role === "other" && view ? { ...view, fileUrl: undefined, previewUrl: undefined } : view,
    role,
    digital,
  };
}
