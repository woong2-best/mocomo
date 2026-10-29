"use server";

import { auth, requireAdmin, requireAuth } from "@/lib/auth";
import { attachCloudShareSecret, maybeAutoApproveDigitalDelivery, mutateDigitalDelivery } from "@/lib/digital-delivery";
import { publicDigitalDelivery, readDigitalDelivery, isDigitalListing } from "@/lib/market-tracks";
import { db } from "@/lib/db";

export async function updateDigitalDelivery(input: {
  listingId: string;
  action: "start" | "upload" | "approve" | "dispute";
  fileUrl?: string;
  fileName?: string;
  previewUrl?: string;
  disputeReason?: string;
  cloudShareUrl?: string;
  sharePassword?: string;
  fileSha256?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
}) {
  const user = await requireAuth();
  return mutateDigitalDelivery(user.id, input.listingId, input.action, {
    fileUrl: input.fileUrl,
    fileName: input.fileName,
    previewUrl: input.previewUrl,
    disputeReason: input.disputeReason,
    cloudShareUrl: input.cloudShareUrl,
    sharePassword: input.sharePassword,
    fileSha256: input.fileSha256,
    fileMimeType: input.fileMimeType,
    fileSizeBytes: input.fileSizeBytes,
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
  const view = publicDigitalDelivery(refreshed ?? state, role === "seller" ? "seller" : role === "buyer" ? "buyer" : "other");
  const delivery = await attachCloudShareSecret(listingId, role === "seller" || role === "buyer" ? role : "other", view);
  return {
    delivery,
    role,
    digital,
  };
}
