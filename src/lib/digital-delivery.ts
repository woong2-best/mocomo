import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { decryptAes256Gcm, encryptAes256Gcm, isOAuthEncryptionConfigured, type EncryptedBlob } from "@/lib/encryption";
import { releaseMarketplaceEscrow } from "@/lib/marketplace/escrow";
import { verifyCloudDelivery } from "@/lib/digital-cloud/cloud-drive";
import { validateCloudShareUrl } from "@/lib/digital-cloud/cloud-share-url";
import { approveMocoEscrow, disputeMocoEscrow, refundMocoEscrow } from "@/lib/moco-escrow";
import {
  DIGITAL_AUTO_APPROVE_MS,
  digitalDeliveryCompleted,
  readDigitalDelivery,
  type DigitalDeliveryState,
  type DigitalDeliveryStatus,
} from "@/lib/market-tracks";

const RELEASABLE = new Set(["PAID", "PREPARING", "SHIPPED", "DELIVERED", "CONFIRMED"]);

export type DigitalDeliveryFile = {
  fileUrl?: string;
  fileName?: string;
  previewUrl?: string;
  disputeReason?: string;
  cloudShareUrl?: string;
  sharePassword?: string;
  fileSha256?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
};

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
  const { sharePassword: _password, ...stored } = next;
  base.digitalDelivery = stored;
  await db.usedListing.update({
    where: { id: listingId },
    data: { subcultureMeta: base as Prisma.InputJsonValue },
  });
}

function sealPassword(password: string | undefined): { secret?: Prisma.InputJsonValue; error?: string } {
  const trimmed = password?.trim() ?? "";
  if (!trimmed) return {};
  if (trimmed.length > 128) return { error: "Password is too long." };
  if (!isOAuthEncryptionConfigured()) {
    return { error: "Share passwords are unavailable right now. Leave the password blank." };
  }
  return { secret: encryptAes256Gcm(trimmed) as unknown as Prisma.InputJsonValue };
}

function openPassword(value: unknown): string | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const blob = value as EncryptedBlob;
  if (!blob.ciphertext || !blob.iv || !blob.authTag) return undefined;
  try {
    return decryptAes256Gcm(blob);
  } catch {
    return undefined;
  }
}

export async function attachCloudShareSecret(
  listingId: string,
  role: "buyer" | "seller" | "other",
  delivery: DigitalDeliveryState | null
): Promise<DigitalDeliveryState | null> {
  if (!delivery || role === "other") return delivery;
  const visible = role === "seller" || delivery.status === "uploaded" || delivery.status === "completed";
  if (!visible) return delivery;
  const order = await db.marketplaceOrder.findFirst({
    where: { usedListingId: listingId },
    select: { cloudShareSecret: true, buyerId: true },
  });
  const sharePassword = openPassword(order?.cloudShareSecret);
  return sharePassword ? { ...delivery, sharePassword } : delivery;
}

export async function mutateDigitalDelivery(
  userId: string,
  listingId: string,
  action: "start" | "upload" | "approve" | "dispute" | "force",
  file?: DigitalDeliveryFile,
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
  if (action === "approve") {
    const held = await db.digitalCommission.findFirst({
      where: { listingId, status: { in: ["DISPUTED", "LATE_CANCEL"] } },
      select: { id: true },
    });
    if (held) return { error: "This delivery is in dispute." };
  }
  const status = nextStatus(current.status, action);
  if (!status) return { error: "That delivery step is not available." };

  const order = await db.marketplaceOrder.findFirst({
    where: { usedListingId: listingId },
    select: { id: true, buyerId: true, mocoEscrowStatus: true, checkoutMode: true, fileSha256: true },
  });

  let cloudHref = current.cloudShareUrl;
  let sha256 = file?.fileSha256 || current.fileSha256;
  let mimeType = file?.fileMimeType || current.fileMimeType;
  let sizeBytes = file?.fileSizeBytes || current.fileSizeBytes;
  let sealed: Prisma.InputJsonValue | undefined;

  if (action === "upload") {
    const cloudRaw = file?.cloudShareUrl?.trim() || file?.fileUrl?.trim() || "";
    if (!cloudRaw) return { error: "Add a Google Drive or Dropbox link." };
    if (!validateCloudShareUrl(cloudRaw).ok) return { error: "Use an https Google Drive or Dropbox link." };
    if (!order || order.mocoEscrowStatus !== "PENDING") {
      return { error: "The buyer has not paid with MOCO yet." };
    }
    const password = sealPassword(file?.sharePassword);
    if (password.error) return { error: password.error };
    sealed = password.secret;
    const verified = await verifyCloudDelivery({
      cloudUrl: cloudRaw,
      buyerUserId: order.buyerId,
      declaredHash: file?.fileSha256,
      expectedHash: current.fileSha256 || order.fileSha256,
    });
    if (!verified.ok) {
      if (verified.code !== "invalid_hash" && order.mocoEscrowStatus === "PENDING") {
        const refunded = await refundMocoEscrow(order.id, `Digital delivery failed: ${verified.code}`);
        if ("error" in refunded) return { error: refunded.error };
      }
      if (verified.code === "invalid_url") return { error: "That cloud link could not be used. The MOCO payment was returned." };
      if (verified.code === "permission_failed") {
        return { error: "The buyer could not be given access to that file. The MOCO payment was returned." };
      }
      if (verified.code === "hash_mismatch") return { error: "The file hash does not match. The MOCO payment was returned." };
      return { error: "File hash must be a SHA-256 or MD5 hex string." };
    }
    cloudHref = verified.href;
    sha256 = verified.sha256 || sha256;
    mimeType = verified.mimeType || mimeType;
    sizeBytes = verified.sizeBytes || sizeBytes;
    const autoApproveAt = new Date(Date.now() + DIGITAL_AUTO_APPROVE_MS);
    await db.marketplaceOrder.update({
      where: { id: order.id },
      data: {
        cloudShareUrl: verified.href,
        cloudShareSecret: sealed ?? undefined,
        fileSha256: sha256 ?? null,
        fileMimeType: mimeType?.slice(0, 120) ?? null,
        fileSizeBytes: sizeBytes && sizeBytes > 0 && sizeBytes <= 2_000_000_000 ? Math.floor(sizeBytes) : null,
        autoApproveAt,
      },
    });
  }

  const next: DigitalDeliveryState = {
    ...current,
    status,
    cloudShareUrl: cloudHref || current.cloudShareUrl,
    fileUrl: cloudHref || file?.fileUrl || current.fileUrl,
    fileName: file?.fileName || current.fileName,
    fileSha256: sha256,
    fileMimeType: mimeType,
    fileSizeBytes: sizeBytes,
    previewUrl: file?.previewUrl || current.previewUrl,
    uploadedAt: status === "uploaded" ? current.uploadedAt ?? new Date().toISOString() : current.uploadedAt,
    autoApproveAt:
      status === "uploaded"
        ? new Date(Date.now() + DIGITAL_AUTO_APPROVE_MS).toISOString()
        : current.autoApproveAt,
    disputed: action === "dispute" ? true : current.disputed,
    approvedAt: status === "completed" ? new Date().toISOString() : current.approvedAt,
  };

  const orderId = party && "orderId" in party ? party.orderId : order?.id ?? null;
  if (status === "completed") {
    const settledOrderId = orderId ?? order?.id ?? null;
    if (settledOrderId) {
      const settled = await db.marketplaceOrder.findUnique({ where: { id: settledOrderId } });
      if (settled && settled.mocoEscrowStatus) {
        if (settled.mocoEscrowStatus === "DISPUTED") return { error: "This delivery is in dispute." };
        const released = await approveMocoEscrow(settled.id, { auto: options?.auto });
        if ("error" in released) return { error: released.error };
      } else if (settled && settled.status !== "REFUNDED" && settled.status !== "CANCELLED" && settled.status !== "DISPUTED") {
        if (RELEASABLE.has(settled.status) && settled.status !== "CONFIRMED") {
          await db.marketplaceOrder.update({
            where: { id: settled.id },
            data: { status: "CONFIRMED", confirmedAt: new Date() },
          });
        }
        const released = await releaseMarketplaceEscrow(settled.id, { actorId: userId });
        if ("error" in released && settled.escrowHeld && settled.stripePaymentIntentId) {
          return { error: released.error };
        }
      }
    }
  }

  await writeDelivery(listingId, listing.subcultureMeta, next);
  if (action === "dispute" && order) {
    await disputeMocoEscrow(order.id);
    await db.digitalCommission.updateMany({
      where: { listingId, status: { in: ["PAID", "IN_PROGRESS", "DELIVERED", "ACCEPTED"] } },
      data: { status: "DISPUTED", disputeReason: file?.disputeReason?.slice(0, 500) || "Dispute opened" },
    });
  }
  if (status === "completed") {
    await db.digitalCommission.updateMany({
      where: { listingId, status: { notIn: ["APPROVED", "AUTO_APPROVED"] } },
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
  const held = await db.digitalCommission.findFirst({
    where: { listingId, status: { in: ["DISPUTED", "LATE_CANCEL"] } },
    select: { id: true },
  });
  if (held) return state;
  const uploaded = new Date(state.uploadedAt).getTime();
  const scheduled = state.autoApproveAt ? new Date(state.autoApproveAt).getTime() : uploaded + DIGITAL_AUTO_APPROVE_MS;
  if (!Number.isFinite(scheduled) || Date.now() < scheduled) return state;
  const result = await mutateDigitalDelivery(actorId, listingId, "force", undefined, { asAdmin: true, auto: true });
  return "delivery" in result ? result.delivery : state;
}

export async function assertDigitalDisputeOpen(listingMeta: unknown): Promise<string | null> {
  if (digitalDeliveryCompleted(listingMeta)) {
    return "This digital delivery is already approved. Payment cancellation is closed.";
  }
  return null;
}
