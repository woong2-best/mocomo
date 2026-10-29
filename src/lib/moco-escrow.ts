import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { assertMoneyAgeAllowed } from "@/lib/money-age-gate";
import { escrowMocoFromListingPrice } from "@/lib/moco-escrow-amount";
import { isDigitalListing, readDigitalDelivery } from "@/lib/market-tracks";
import { getOrCreatePlatformWallet } from "@/lib/platform/wallet/service";
import { finalizeUsedListingSold } from "@/lib/subculture-commerce/sale-records";

const HOLD_REF = "moco_escrow_hold";
const PENDING_REF = "moco_escrow_pending";
const RELEASE_REF = "moco_escrow_release";
const RELEASE_PENDING_REF = "moco_escrow_release_pending";
const REFUND_REF = "moco_escrow_refund";
const REFUND_PENDING_REF = "moco_escrow_refund_pending";

/**
 * Buyer purchase: spendable MOCO leaves the buyer and sits in the seller's pending_moco.
 * Approval moves pending_moco into the seller's spendable balance.
 * A failed cloud delivery returns pending_moco to the buyer.
 */
export async function ensureDigitalMocoEscrow(input: { buyerId: string; listingId: string }) {
  const age = await assertMoneyAgeAllowed(input.buyerId);
  if (age) return { error: age.error };

  const listing = await db.usedListing.findUnique({
    where: { id: input.listingId },
    select: {
      id: true,
      sellerId: true,
      price: true,
      currency: true,
      title: true,
      status: true,
      saleType: true,
      category: true,
      productType: true,
    },
  });
  if (!listing) return { error: "Listing not found." as const };
  if (!isDigitalListing(listing) || listing.saleType === "AUCTION") {
    return { error: "This listing is not a digital MOCO purchase." as const };
  }
  if (listing.sellerId === input.buyerId) return { error: "You can't buy your own listing." as const };
  if (listing.status === "SOLD") return { error: "This item has already been sold." as const };

  const amount = escrowMocoFromListingPrice(listing.price, listing.currency);
  if (!amount) return { error: "This listing can't be paid in MOCO." as const };

  await Promise.all([
    getOrCreatePlatformWallet(input.buyerId),
    getOrCreatePlatformWallet(listing.sellerId),
  ]);
  const sellerProfile = await db.marketplaceSellerProfile.findUnique({
    where: { userId: listing.sellerId },
    select: { id: true },
  });

  try {
    const held = await db.$transaction(async (tx) => {
      const existing = await tx.marketplaceOrder.findUnique({
        where: { usedListingId: listing.id },
      });
      if (existing?.mocoEscrowStatus === "PENDING") {
        if (existing.buyerId !== input.buyerId) throw new Error("UNAVAILABLE");
        return { id: existing.id, fresh: false as const };
      }
      if (existing?.mocoEscrowStatus === "APPROVED" || listing.status === "SOLD") {
        throw new Error("SOLD");
      }
      if (existing?.mocoEscrowStatus === "DISPUTED") throw new Error("DISPUTED");
      if (
        existing &&
        existing.checkoutMode === "STRIPE" &&
        existing.mocoEscrowStatus == null &&
        existing.status !== "CANCELLED" &&
        existing.status !== "REFUNDED"
      ) {
        throw new Error("STRIPE");
      }

      const reserved = await tx.usedListing.updateMany({
        where: { id: listing.id, sellerId: listing.sellerId, status: "SELLING" },
        data: { status: "RESERVED" },
      });
      if (reserved.count !== 1) throw new Error("UNAVAILABLE");

      const debited = await tx.platformWallet.updateMany({
        where: { userId: input.buyerId, mocoPoints: { gte: amount } },
        data: { mocoPoints: { decrement: amount } },
      });
      if (debited.count !== 1) throw new Error("INSUFFICIENT");

      const order = existing
        ? await tx.marketplaceOrder.update({
            where: { id: existing.id },
            data: {
              buyerId: input.buyerId,
              sellerId: listing.sellerId,
              status: "PAID",
              checkoutMode: "MOCO",
              escrowHeld: true,
              mocoEscrowStatus: "PENDING",
              mocoAmount: amount,
              subtotalAmount: listing.price,
              sellerEarnAmount: listing.price,
              platformFeeAmount: 0,
              shippingAmount: 0,
              currency: (listing.currency || "krw").toLowerCase(),
              cancelledAt: null,
              confirmedAt: null,
              settledAt: null,
              settlementStatus: "HELD",
              cloudShareUrl: null,
              cloudShareSecret: Prisma.DbNull,
              fileSha256: null,
              fileSizeBytes: null,
              fileMimeType: null,
              autoApproveAt: null,
            },
          })
        : await tx.marketplaceOrder.create({
            data: {
              buyerId: input.buyerId,
              sellerId: listing.sellerId,
              sellerProfileId: sellerProfile?.id ?? null,
              status: "PAID",
              checkoutMode: "MOCO",
              escrowHeld: true,
              mocoEscrowStatus: "PENDING",
              mocoAmount: amount,
              subtotalAmount: listing.price,
              sellerEarnAmount: listing.price,
              platformFeeAmount: 0,
              shippingAmount: 0,
              currency: (listing.currency || "krw").toLowerCase(),
              settlementStatus: "HELD",
              usedListingId: listing.id,
              items: {
                create: {
                  usedListingId: listing.id,
                  titleSnapshot: listing.title.slice(0, 500),
                  unitPrice: listing.price,
                  quantity: 1,
                  listingType: "DIGITAL",
                },
              },
            },
          });

      const buyerWallet = await tx.platformWallet.findUniqueOrThrow({ where: { userId: input.buyerId } });
      const sellerWallet = await tx.platformWallet.update({
        where: { userId: listing.sellerId },
        data: { pendingMoco: { increment: amount } },
      });
      await tx.platformWalletLedger.create({
        data: {
          walletId: buyerWallet.id,
          bucket: "MOCO_POINTS",
          delta: -amount,
          balanceAfter: buyerWallet.mocoPoints,
          reason: "Digital purchase escrow",
          referenceType: HOLD_REF,
          referenceId: order.id,
        },
      });
      await tx.platformWalletLedger.create({
        data: {
          walletId: sellerWallet.id,
          bucket: "MOCO_PENDING",
          delta: amount,
          balanceAfter: sellerWallet.pendingMoco,
          reason: "Digital purchase escrow",
          referenceType: PENDING_REF,
          referenceId: order.id,
        },
      });
      const metaRow = await tx.usedListing.findUnique({
        where: { id: listing.id },
        select: { subcultureMeta: true },
      });
      const prior = readDigitalDelivery(metaRow?.subcultureMeta);
      const base =
        metaRow?.subcultureMeta && typeof metaRow.subcultureMeta === "object" && !Array.isArray(metaRow.subcultureMeta)
          ? { ...(metaRow.subcultureMeta as Record<string, unknown>) }
          : {};
      base.digitalDelivery = {
        kind: prior?.kind === "commission" ? "commission" : "ready",
        status: "held",
      };
      await tx.usedListing.update({
        where: { id: listing.id },
        data: {
          marketplaceOrderId: order.id,
          status: "RESERVED",
          subcultureMeta: base as Prisma.InputJsonValue,
        },
      });
      return { id: order.id, fresh: true as const };
    });
    return { orderId: held.id, amount, fresh: held.fresh };
  } catch (error) {
    return escrowFailure(error);
  }
}

export async function approveMocoEscrow(orderId: string, opts?: { auto?: boolean }) {
  try {
    const listingId = await db.$transaction(async (tx) => {
      const order = await tx.marketplaceOrder.findUnique({ where: { id: orderId } });
      if (!order?.mocoAmount || order.mocoAmount < 1) throw new Error("MISSING");
      if (order.mocoEscrowStatus === "APPROVED") return order.usedListingId;
      if (order.mocoEscrowStatus === "DISPUTED") throw new Error("DISPUTED");
      if (order.mocoEscrowStatus !== "PENDING") throw new Error("STATE");

      const released = await tx.platformWalletLedger.findFirst({
        where: { referenceType: RELEASE_REF, referenceId: order.id },
        select: { id: true },
      });
      if (released) return order.usedListingId;

      const amount = order.mocoAmount;
      const moved = await tx.platformWallet.updateMany({
        where: { userId: order.sellerId, pendingMoco: { gte: amount } },
        data: {
          pendingMoco: { decrement: amount },
          mocoPoints: { increment: amount },
        },
      });
      if (moved.count !== 1) throw new Error("PENDING_SHORT");
      const seller = await tx.platformWallet.findUniqueOrThrow({ where: { userId: order.sellerId } });
      const reason = opts?.auto ? "Digital escrow auto-approved" : "Digital escrow approved";
      await tx.platformWalletLedger.createMany({
        data: [
          {
            walletId: seller.id,
            bucket: "MOCO_PENDING",
            delta: -amount,
            balanceAfter: seller.pendingMoco,
            reason,
            referenceType: RELEASE_PENDING_REF,
            referenceId: order.id,
          },
          {
            walletId: seller.id,
            bucket: "MOCO_POINTS",
            delta: amount,
            balanceAfter: seller.mocoPoints,
            reason,
            referenceType: RELEASE_REF,
            referenceId: order.id,
          },
        ],
      });
      await tx.marketplaceOrder.update({
        where: { id: order.id },
        data: {
          mocoEscrowStatus: "APPROVED",
          status: "CONFIRMED",
          escrowHeld: false,
          settlementStatus: "SETTLED",
          confirmedAt: new Date(),
          settledAt: new Date(),
        },
      });
      if (order.usedListingId) {
        await tx.usedListing.update({
          where: { id: order.usedListingId },
          data: { status: "SOLD" },
        });
      }
      return order.usedListingId;
    });
    if (listingId) void finalizeUsedListingSold(listingId).catch(() => undefined);
    return { ok: true as const };
  } catch (error) {
    if (error instanceof Error && error.message === "PENDING_SHORT") {
      const again = await db.marketplaceOrder.findUnique({
        where: { id: orderId },
        select: { mocoEscrowStatus: true },
      });
      if (again?.mocoEscrowStatus === "APPROVED") return { ok: true as const };
    }
    return escrowFailure(error);
  }
}

export async function refundMocoEscrow(orderId: string, reason: string) {
  try {
    await db.$transaction(async (tx) => {
      const order = await tx.marketplaceOrder.findUnique({ where: { id: orderId } });
      if (!order?.mocoAmount || order.mocoAmount < 1) throw new Error("MISSING");
      if (order.mocoEscrowStatus === "REFUNDED") return;
      if (order.mocoEscrowStatus === "APPROVED") throw new Error("STATE");
      if (order.mocoEscrowStatus !== "PENDING" && order.mocoEscrowStatus !== "DISPUTED") {
        throw new Error("STATE");
      }
      const amount = order.mocoAmount;
      const pulled = await tx.platformWallet.updateMany({
        where: { userId: order.sellerId, pendingMoco: { gte: amount } },
        data: { pendingMoco: { decrement: amount } },
      });
      if (pulled.count !== 1) throw new Error("PENDING_SHORT");
      const buyer = await tx.platformWallet.update({
        where: { userId: order.buyerId },
        data: { mocoPoints: { increment: amount } },
      });
      const seller = await tx.platformWallet.findUniqueOrThrow({ where: { userId: order.sellerId } });
      const note = reason.slice(0, 180);
      await tx.platformWalletLedger.createMany({
        data: [
          {
            walletId: seller.id,
            bucket: "MOCO_PENDING",
            delta: -amount,
            balanceAfter: seller.pendingMoco,
            reason: note,
            referenceType: REFUND_PENDING_REF,
            referenceId: order.id,
          },
          {
            walletId: buyer.id,
            bucket: "MOCO_POINTS",
            delta: amount,
            balanceAfter: buyer.mocoPoints,
            reason: note,
            referenceType: REFUND_REF,
            referenceId: order.id,
          },
        ],
      });
      await tx.marketplaceOrder.update({
        where: { id: order.id },
        data: {
          mocoEscrowStatus: "REFUNDED",
          status: "REFUNDED",
          escrowHeld: false,
          settlementStatus: "REVERSED",
          cancelledAt: new Date(),
          autoApproveAt: null,
        },
      });
      if (order.usedListingId) {
        await tx.usedListing.updateMany({
          where: { id: order.usedListingId, status: "RESERVED" },
          data: { status: "SELLING" },
        });
      }
    });
    return { ok: true as const };
  } catch (error) {
    return escrowFailure(error);
  }
}

export async function disputeMocoEscrow(orderId: string) {
  await db.marketplaceOrder.updateMany({
    where: { id: orderId, mocoEscrowStatus: "PENDING" },
    data: { mocoEscrowStatus: "DISPUTED", status: "DISPUTED", escrowHeld: true },
  });
  return { ok: true as const };
}

/** Releases pending MOCO after auto_approve_at when the delivery was not disputed. */
export async function sweepDueMocoEscrowApprovals(limit = 40) {
  const due = await db.marketplaceOrder.findMany({
    where: {
      mocoEscrowStatus: "PENDING",
      autoApproveAt: { lte: new Date() },
    },
    take: limit,
    orderBy: { autoApproveAt: "asc" },
    select: { id: true, usedListingId: true },
  });
  let approved = 0;
  for (const row of due) {
    if (row.usedListingId) {
      const listing = await db.usedListing.findUnique({
        where: { id: row.usedListingId },
        select: { subcultureMeta: true },
      });
      const state = readDigitalDelivery(listing?.subcultureMeta);
      if (!state || state.disputed || state.status === "completed" || state.status !== "uploaded") continue;
    }
    const result = await approveMocoEscrow(row.id, { auto: true });
    if (!("ok" in result)) continue;
    approved += 1;
    if (row.usedListingId) await markDigitalDeliveryAutoApproved(row.usedListingId);
  }
  return { approved, scanned: due.length };
}

async function markDigitalDeliveryAutoApproved(listingId: string) {
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: { subcultureMeta: true },
  });
  const state = readDigitalDelivery(listing?.subcultureMeta);
  if (!state || state.status === "completed" || state.disputed) return;
  const base =
    listing?.subcultureMeta && typeof listing.subcultureMeta === "object" && !Array.isArray(listing.subcultureMeta)
      ? { ...(listing.subcultureMeta as Record<string, unknown>) }
      : {};
  base.digitalDelivery = {
    ...state,
    status: "completed",
    approvedAt: new Date().toISOString(),
  };
  await db.usedListing.update({
    where: { id: listingId },
    data: { subcultureMeta: base as Prisma.InputJsonValue },
  });
  await db.digitalCommission.updateMany({
    where: { listingId, status: { notIn: ["APPROVED", "AUTO_APPROVED"] } },
    data: { status: "AUTO_APPROVED" },
  });
}

function escrowErrorMessage(error: unknown): string | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return "This item is no longer available.";
  }
  const message = error instanceof Error ? error.message : "";
  if (message === "INSUFFICIENT") return "Insufficient MOCO balance.";
  if (message === "UNAVAILABLE" || message === "SOLD") return "This item is no longer available.";
  if (message === "STRIPE") return "This item already has a card payment.";
  if (message === "DISPUTED") return "This delivery is in dispute.";
  if (message === "PENDING_SHORT") return "Escrow funds could not be moved.";
  if (message === "STATE" || message === "MISSING") return "This escrow can no longer be changed.";
  return null;
}

function escrowFailure(error: unknown): { error: string } {
  const message = escrowErrorMessage(error);
  if (!message) throw error;
  return { error: message };
}
