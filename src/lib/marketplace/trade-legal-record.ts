import { db } from "@/lib/db";

export type TradeLegalParticipant = {
  userId: string;
  username: string | null;
  accountCreatedAt: string;
  phoneVerified: boolean;
  countryCode: string | null;
  priorReportCount: number;
  priorDisputesOpened: number;
};

export type TradeLegalChatLine = {
  id: string;
  at: string;
  senderId: string;
  senderUsername: string | null;
  content: string | null;
  attachmentUrls: string[];
};

export type TradeLegalRecord = {
  schemaVersion: 1;
  capturedAt: string;
  order: {
    id: string;
    status: string;
    settlementStatus: string;
    subtotalAmount: number;
    shippingAmount: number;
    platformFeeAmount: number;
    sellerEarnAmount: number;
    currency: string;
    checkoutMode: string;
    createdAt: string;
    confirmedAt: string | null;
    buyerDirectPaidAt: string | null;
    autoConfirmAt: string | null;
    stripePaymentIntentId: string | null;
    usedListingId: string | null;
  };
  listing: {
    id: string;
    title: string;
    price: number;
    currency: string | null;
    status: string;
    saleType: string | null;
    createdAt: string;
    sellerId: string;
  } | null;
  shipment: {
    status: string;
    carrier: string | null;
    trackingNumber: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    proofUrls: string[];
  } | null;
  participants: {
    buyer: TradeLegalParticipant;
    seller: TradeLegalParticipant;
  };
  timeline: { at: string; event: string; detail?: string }[];
  chat: TradeLegalChatLine[];
  audit: { at: string; action: string; detail: string | null; actorId: string | null }[];
};

async function participantSnapshot(userId: string): Promise<TradeLegalParticipant> {
  const [user, reportCount, disputesOpened] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        createdAt: true,
        phoneVerified: true,
        countryCode: true,
      },
    }),
    db.report.count({ where: { reportedUserId: userId } }).catch(() => 0),
    db.marketplaceDispute.count({ where: { openerId: userId } }).catch(() => 0),
  ]);
  return {
    userId,
    username: user?.username ?? null,
    accountCreatedAt: user?.createdAt.toISOString() ?? new Date(0).toISOString(),
    phoneVerified: user?.phoneVerified ?? false,
    countryCode: user?.countryCode ?? null,
    priorReportCount: reportCount,
    priorDisputesOpened: disputesOpened,
  };
}

async function resolveTradeChatRoomId(order: {
  usedListingId: string | null;
  buyerId: string;
}): Promise<string | null> {
  if (!order.usedListingId) return null;
  const listingChat = await db.usedListingChat.findUnique({
    where: {
      listingId_buyerId: { listingId: order.usedListingId, buyerId: order.buyerId },
    },
    select: { roomId: true },
  });
  if (listingChat?.roomId) return listingChat.roomId;
  const direct = await db.usedDirectTrade.findUnique({
    where: { listingId: order.usedListingId },
    select: { roomId: true },
  });
  return direct?.roomId ?? null;
}

/** Build or refresh immutable-friendly legal record on the order row. */
export async function buildTradeLegalRecord(orderId: string): Promise<TradeLegalRecord | null> {
  const order = await db.marketplaceOrder.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      shipment: true,
      auditLogs: { orderBy: { createdAt: "asc" }, take: 200 },
    },
  });
  if (!order) return null;

  const usedListingId = order.usedListingId ?? order.items.find((i) => i.usedListingId)?.usedListingId ?? null;
  let listing: TradeLegalRecord["listing"] = null;
  if (usedListingId) {
    const row = await db.usedListing.findUnique({
      where: { id: usedListingId },
      select: {
        id: true,
        title: true,
        price: true,
        currency: true,
        status: true,
        saleType: true,
        createdAt: true,
        sellerId: true,
      },
    });
    if (row) {
      listing = {
        id: row.id,
        title: row.title,
        price: row.price,
        currency: row.currency,
        status: row.status,
        saleType: row.saleType,
        createdAt: row.createdAt.toISOString(),
        sellerId: row.sellerId,
      };
    }
  }

  const roomId = await resolveTradeChatRoomId({
    usedListingId,
    buyerId: order.buyerId,
  });

  let chat: TradeLegalChatLine[] = [];
  if (roomId) {
    const messages = await db.message.findMany({
      where: { roomId },
      orderBy: { createdAt: "asc" },
      take: 500,
      include: {
        sender: { select: { username: true } },
        attachments: { select: { url: true } },
      },
    });
    chat = messages.map((m) => ({
      id: m.id,
      at: m.createdAt.toISOString(),
      senderId: m.senderId,
      senderUsername: m.sender.username,
      content: m.content,
      attachmentUrls: m.attachments.map((a) => a.url),
    }));
  }

  const [buyer, seller] = await Promise.all([
    participantSnapshot(order.buyerId),
    participantSnapshot(order.sellerId),
  ]);

  const timeline: TradeLegalRecord["timeline"] = [];
  timeline.push({ at: order.createdAt.toISOString(), event: "ORDER_CREATED" });
  if (order.buyerDirectPaidAt) {
    timeline.push({ at: order.buyerDirectPaidAt.toISOString(), event: "BUYER_DIRECT_PAID" });
  }
  if (order.shipment?.shippedAt) {
    timeline.push({ at: order.shipment.shippedAt.toISOString(), event: "SHIPMENT_REGISTERED" });
  }
  if (order.shipment?.deliveredAt) {
    timeline.push({ at: order.shipment.deliveredAt.toISOString(), event: "DELIVERY_CONFIRMED" });
  }
  if (order.confirmedAt) {
    timeline.push({ at: order.confirmedAt.toISOString(), event: "PURCHASE_CONFIRMED" });
  }
  if (order.settledAt) {
    timeline.push({ at: order.settledAt.toISOString(), event: "SETTLEMENT_COMPLETED" });
  }
  if (listing) {
    timeline.unshift({ at: listing.createdAt, event: "LISTING_PUBLISHED", detail: listing.title });
  }
  if (chat.length > 0) {
    timeline.push({ at: chat[0]!.at, event: "CHAT_FIRST_MESSAGE" });
    timeline.push({ at: chat[chat.length - 1]!.at, event: "CHAT_LAST_MESSAGE" });
  }
  timeline.sort((a, b) => a.at.localeCompare(b.at));

  const record: TradeLegalRecord = {
    schemaVersion: 1,
    capturedAt: new Date().toISOString(),
    order: {
      id: order.id,
      status: order.status,
      settlementStatus: order.settlementStatus,
      subtotalAmount: order.subtotalAmount,
      shippingAmount: order.shippingAmount,
      platformFeeAmount: order.platformFeeAmount,
      sellerEarnAmount: order.sellerEarnAmount,
      currency: order.currency,
      checkoutMode: order.checkoutMode,
      createdAt: order.createdAt.toISOString(),
      confirmedAt: order.confirmedAt?.toISOString() ?? null,
      buyerDirectPaidAt: order.buyerDirectPaidAt?.toISOString() ?? null,
      autoConfirmAt: order.autoConfirmAt?.toISOString() ?? null,
      stripePaymentIntentId: order.stripePaymentIntentId,
      usedListingId,
    },
    listing,
    shipment: order.shipment
      ? {
          status: order.shipment.status,
          carrier: order.shipment.carrier,
          trackingNumber: order.shipment.trackingNumber,
          shippedAt: order.shipment.shippedAt?.toISOString() ?? null,
          deliveredAt: order.shipment.deliveredAt?.toISOString() ?? null,
          proofUrls: order.shipment.proofUrls ?? [],
        }
      : null,
    participants: { buyer, seller },
    timeline,
    chat,
    audit: order.auditLogs.map((row) => ({
      at: row.createdAt.toISOString(),
      action: row.action,
      detail: row.detail,
      actorId: row.actorId,
    })),
  };

  return record;
}

export async function refreshTradeLegalRecord(orderId: string): Promise<void> {
  const record = await buildTradeLegalRecord(orderId);
  if (!record) return;
  try {
    await db.marketplaceOrder.update({
      where: { id: orderId },
      data: { tradeLegalRecord: record as object },
    });
  } catch (e) {
    console.error("[trade-legal-record] refresh failed", orderId, e);
  }
}

export function formatTradeLegalRecordExport(
  dispute: {
    id: string;
    reasonCode: string;
    reason: string;
    createdAt: Date;
    status: string;
    tradeEvidenceSnapshot: unknown;
  },
  orderId: string
): string {
  const header = [
    "MoCoMo Marketplace Trade Dispute — Legal Evidence Export",
    `Generated: ${new Date().toISOString()}`,
    `Dispute ID: ${dispute.id}`,
    `Order ID: ${orderId}`,
    `Status: ${dispute.status}`,
    `Reason code: ${dispute.reasonCode}`,
    `Reported at: ${dispute.createdAt.toISOString()}`,
    "",
    "=== Complainant statement ===",
    dispute.reason,
    "",
    "=== Full evidence bundle (JSON) ===",
  ].join("\n");
  return `${header}\n${JSON.stringify(dispute.tradeEvidenceSnapshot, null, 2)}\n`;
}
