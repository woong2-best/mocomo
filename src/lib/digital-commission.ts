import { db } from "@/lib/db";
import { createMobileUsedListing } from "@/lib/used-market-mobile";

const PURPOSES = new Set(["broadcast", "personal"]);

async function ensureCommissionRoom(sellerId: string, buyerId: string) {
  const existing = await db.chatRoom.findFirst({
    where: {
      type: "DM",
      AND: [
        { members: { some: { userId: sellerId } } },
        { members: { some: { userId: buyerId } } },
      ],
    },
    select: { id: true },
  });
  if (existing) return existing.id;
  const room = await db.chatRoom.create({
    data: {
      type: "DM",
      members: {
        create: [
          { userId: sellerId, role: "owner" },
          { userId: buyerId, role: "member" },
        ],
      },
    },
    select: { id: true },
  });
  return room.id;
}

export async function createDigitalCommission(input: {
  buyerId: string;
  sellerId: string;
  brief: string;
  purpose: string;
  referenceUrls: string[];
}) {
  const brief = input.brief.trim();
  if (brief.length < 8) return { error: "Describe the commission." as const };
  if (input.buyerId === input.sellerId) return { error: "You cannot request yourself." as const };
  if (!PURPOSES.has(input.purpose)) return { error: "Choose a purpose." as const };
  const seller = await db.user.findUnique({ where: { id: input.sellerId }, select: { id: true } });
  if (!seller) return { error: "Creator not found." as const };
  const row = await db.digitalCommission.create({
    data: {
      buyerId: input.buyerId,
      sellerId: input.sellerId,
      brief: brief.slice(0, 4000),
      purpose: input.purpose,
      referenceUrls: input.referenceUrls.slice(0, 6),
      status: "REQUESTED",
    },
  });
  return { id: row.id };
}

export async function listDisputedDigitalCommissions() {
  return db.digitalCommission.findMany({
    where: { status: "DISPUTED" },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: {
      buyer: { select: { username: true } },
      seller: { select: { username: true } },
    },
  });
}

export async function listDigitalCommissions(userId: string) {
  const rows = await db.digitalCommission.findMany({
    where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
    orderBy: { createdAt: "desc" },
    take: 40,
    include: {
      buyer: { select: { id: true, username: true } },
      seller: { select: { id: true, username: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    brief: row.brief,
    purpose: row.purpose,
    status: row.status,
    price: row.price,
    currency: row.currency,
    estimatedDays: row.estimatedDays,
    listingId: row.listingId,
    roomId: row.roomId,
    referenceUrls: Array.isArray(row.referenceUrls) ? row.referenceUrls : [],
    buyer: row.buyer,
    seller: row.seller,
    mine: row.sellerId === userId ? "seller" : "buyer",
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function respondDigitalCommission(
  userId: string,
  id: string,
  action: "accept" | "decline",
  quote?: { price: number; estimatedDays: number; currency?: string }
) {
  const row = await db.digitalCommission.findUnique({ where: { id } });
  if (!row || row.sellerId !== userId) return { error: "Request not found." as const };
  if (row.status !== "REQUESTED") return { error: "This request is already answered." as const };
  if (action === "decline") {
    await db.digitalCommission.update({ where: { id }, data: { status: "DECLINED" } });
    return { ok: true as const };
  }
  const price = Math.floor(quote?.price ?? 0);
  const estimatedDays = Math.floor(quote?.estimatedDays ?? 0);
  if (price <= 0 || estimatedDays < 1 || estimatedDays > 90) {
    return { error: "Enter a price and an estimated number of days." as const };
  }
  const created = await createMobileUsedListing(userId, {
    title: `Commission ${row.brief.slice(0, 60)}`,
    description: row.brief,
    price,
    currency: quote?.currency || "krw",
    category: "DIGITAL",
    categories: ["DIGITAL"],
    region: "Shipping",
    images: (Array.isArray(row.referenceUrls) ? row.referenceUrls : []).filter((url): url is string => typeof url === "string"),
    saleType: "FIXED",
    productType: "ILLUSTRATION",
    digitalKind: "commission",
    tradeMode: "SELL",
  });
  if ("error" in created && created.error) return { error: created.error };
  if (!("listingId" in created) || !created.listingId) return { error: "Could not open the commission." as const };
  const roomId = await ensureCommissionRoom(userId, row.buyerId);
  await db.usedListingChat.upsert({
    where: { listingId_buyerId: { listingId: created.listingId, buyerId: row.buyerId } },
    create: { listingId: created.listingId, roomId, buyerId: row.buyerId },
    update: { roomId },
  });
  await db.message.create({
    data: {
      roomId,
      senderId: userId,
      content: `Commission accepted. ${price.toLocaleString()} · about ${estimatedDays} days.\n${row.brief}`,
    },
  });
  await db.digitalCommission.update({
    where: { id },
    data: {
      status: "ACCEPTED",
      price,
      estimatedDays,
      currency: quote?.currency || row.currency,
      listingId: created.listingId,
      roomId,
    },
  });
  return { ok: true as const, listingId: created.listingId, roomId };
}
