import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { readDigitalDelivery } from "@/lib/market-tracks";
import { createMobileUsedListing } from "@/lib/used-market-mobile";
import { watermarkPortfolioUrl } from "@/lib/portfolio-watermark";
import { DEFAULT_STUDIO_CATEGORY_ID, isValidStudioCategoryId } from "@/lib/creator-studio-categories";
import {
  blockHasContent,
  feedMediaFromDoc,
  isHttpsMediaUrl,
  parseStudioPortfolio,
  storeStudioPortfolio,
  type StudioPortfolioBlock,
  type StudioPortfolioDoc,
} from "@/lib/studio-portfolio";

const ACTIVE_SLOT = ["ACCEPTED", "DISPUTED"];
const CLOSED_ORDER = ["APPROVED", "AUTO_APPROVED", "DECLINED", "LATE_CANCEL"];

export type StudioMedia = { url: string; kind: "image" | "gif" | "video" };
export type StudioTier = { id: string; name: string; price: number };
export type StudioAddon = { id: string; name: string; mode: "fixed" | "percent"; amount: number };
export type StudioField = { id: string; label: string; kind: "text" | "image"; required: boolean };

export type StudioInput = {
  category: string;
  title: string;
  about: string;
  open: boolean;
  slotCap: number;
  deliveryDays: number;
  revisionNote: string;
  currency: string;
  coverUrl?: string;
  blocks?: StudioPortfolioBlock[];
  portfolio?: unknown;
  tiers: StudioTier[];
  addons: StudioAddon[];
  formFields: StudioField[];
};

function asRows(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function cleanId(value: unknown, fallback: string) {
  const raw = typeof value === "string" ? value : "";
  const id = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 40);
  return id || fallback;
}

export function parseStudioInput(raw: StudioInput): { value: StudioInput } | { error: string } {
  const category = typeof raw.category === "string" ? raw.category.trim() : "";
  const title = raw.title.trim().slice(0, 80);
  const about = raw.about.trim().slice(0, 2000);
  const revisionNote = raw.revisionNote.trim().slice(0, 1000);
  const currency = raw.currency === "usd" ? "usd" : "krw";
  const slotCap = Math.floor(raw.slotCap);
  const deliveryDays = Math.floor(raw.deliveryDays);
  if (!isValidStudioCategoryId(category)) return { error: "Choose a studio category." };
  if (title.length < 2) return { error: "Add a studio title." };
  if (revisionNote.length < 8) return { error: "Write the revision rules buyers must accept." };
  if (slotCap < 1 || slotCap > 20) return { error: "Slots must be between 1 and 20." };
  if (deliveryDays < 1 || deliveryDays > 90) return { error: "Delivery days must be between 1 and 90." };

  const doc = parseStudioPortfolio({
    coverUrl: raw.coverUrl,
    blocks: raw.blocks,
    portfolio: raw.portfolio,
  });
  if (!isHttpsMediaUrl(doc.coverUrl)) return { error: "Add a cover image for the market list." };
  if (!doc.blocks.some(blockHasContent)) return { error: "Add text, an image, or a YouTube/Vimeo embed to the portfolio." };
  const stored = storeStudioPortfolio(doc);
  const portfolio = feedMediaFromDoc(stored);

  const tiers: StudioTier[] = [];
  for (const [index, row] of asRows(raw.tiers).slice(0, 8).entries()) {
    if (!row || typeof row !== "object") continue;
    const name = typeof (row as { name?: unknown }).name === "string" ? (row as { name: string }).name.trim().slice(0, 40) : "";
    const price = Math.floor(Number((row as { price?: unknown }).price) || 0);
    if (!name || price < 1000 || price > 50_000_000) continue;
    tiers.push({ id: cleanId((row as { id?: unknown }).id, `tier${index + 1}`), name, price });
  }
  if (tiers.length < 1) return { error: "Add at least one price tier." };

  const addons: StudioAddon[] = [];
  for (const [index, row] of asRows(raw.addons).slice(0, 12).entries()) {
    if (!row || typeof row !== "object") continue;
    const name = typeof (row as { name?: unknown }).name === "string" ? (row as { name: string }).name.trim().slice(0, 40) : "";
    const mode = (row as { mode?: unknown }).mode === "percent" ? "percent" : "fixed";
    const amount = Math.floor(Number((row as { amount?: unknown }).amount) || 0);
    const max = mode === "percent" ? 300 : 50_000_000;
    if (!name || amount < 1 || amount > max) continue;
    addons.push({ id: cleanId((row as { id?: unknown }).id, `addon${index + 1}`), name, mode, amount });
  }

  const formFields: StudioField[] = [];
  for (const [index, row] of asRows(raw.formFields).slice(0, 8).entries()) {
    if (!row || typeof row !== "object") continue;
    const label = typeof (row as { label?: unknown }).label === "string" ? (row as { label: string }).label.trim().slice(0, 80) : "";
    if (label.length < 2) continue;
    formFields.push({
      id: cleanId((row as { id?: unknown }).id, `field${index + 1}`),
      label,
      kind: (row as { kind?: unknown }).kind === "image" ? "image" : "text",
      required: (row as { required?: unknown }).required !== false,
    });
  }
  if (formFields.length < 1) return { error: "Add the request form buyers must fill in." };

  return {
    value: {
      category,
      title,
      about,
      open: raw.open !== false,
      slotCap,
      deliveryDays,
      revisionNote,
      currency,
      coverUrl: stored.coverUrl,
      blocks: stored.blocks,
      portfolio,
      tiers,
      addons,
      formFields,
    },
  };
}

export function quoteStudio(tiers: StudioTier[], addons: StudioAddon[], tierId: string, addonIds: string[]) {
  const tier = tiers.find((item) => item.id === tierId);
  if (!tier) return null;
  const picked = addons.filter((item) => addonIds.includes(item.id));
  let total = tier.price;
  for (const addon of picked) {
    total += addon.mode === "percent" ? Math.round((tier.price * addon.amount) / 100) : addon.amount;
  }
  return { tier, addons: picked, total };
}

type StudioRow = {
  id: string;
  sellerId: string;
  category: string;
  title: string;
  about: string;
  open: boolean;
  slotCap: number;
  deliveryDays: number;
  revisionNote: string;
  currency: string;
  portfolio: unknown;
  tiers: unknown;
  addons: unknown;
  formFields: unknown;
  seller: { id: string; username: string; image: string | null };
};

function publicStudio(row: StudioRow, slotsUsed: number) {
  const doc = parseStudioPortfolio(row.portfolio);
  const parsed = parseStudioInput({
    category: row.category || DEFAULT_STUDIO_CATEGORY_ID,
    title: row.title,
    about: row.about,
    open: row.open,
    slotCap: row.slotCap,
    deliveryDays: row.deliveryDays,
    revisionNote: row.revisionNote,
    currency: row.currency,
    coverUrl: doc.coverUrl,
    blocks: doc.blocks,
    portfolio: row.portfolio,
    tiers: asRows(row.tiers) as StudioTier[],
    addons: asRows(row.addons) as StudioAddon[],
    formFields: asRows(row.formFields) as StudioField[],
  });
  const value = "value" in parsed ? parsed.value : null;
  const tiers = value?.tiers ?? [];
  const coverUrl = value?.coverUrl || doc.coverUrl;
  const blocks = value?.blocks ?? doc.blocks;
  return {
    id: row.id,
    sellerId: row.sellerId,
    category: value?.category ?? (row.category || DEFAULT_STUDIO_CATEGORY_ID),
    title: row.title,
    about: row.about,
    open: row.open,
    slotCap: row.slotCap,
    slotsUsed,
    accepting: row.open && slotsUsed < row.slotCap,
    deliveryDays: row.deliveryDays,
    revisionNote: row.revisionNote,
    currency: row.currency,
    coverUrl,
    blocks,
    portfolio: feedMediaFromDoc({ version: 2, coverUrl, blocks }),
    tiers,
    addons: value?.addons ?? [],
    formFields: value?.formFields ?? [],
    fromPrice: tiers.reduce((min, tier) => Math.min(min, tier.price), tiers[0]?.price ?? 0),
    seller: row.seller,
  };
}

async function slotCounts(sellerIds: string[]) {
  if (sellerIds.length === 0) return new Map<string, number>();
  const rows = await db.digitalCommission.groupBy({
    by: ["sellerId"],
    where: { sellerId: { in: sellerIds }, status: { in: ACTIVE_SLOT } },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.sellerId, row._count._all]));
}

const studioSelect = {
  id: true,
  sellerId: true,
  category: true,
  title: true,
  about: true,
  open: true,
  slotCap: true,
  deliveryDays: true,
  revisionNote: true,
  currency: true,
  portfolio: true,
  tiers: true,
  addons: true,
  formFields: true,
  seller: { select: { id: true, username: true, image: true } },
} as const;

export async function listCreatorStudios(q?: string) {
  const query = q?.trim();
  const rows = await db.creatorStudio.findMany({
    where: query
      ? { OR: [{ title: { contains: query, mode: "insensitive" } }, { about: { contains: query, mode: "insensitive" } }] }
      : {},
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: studioSelect,
  });
  const counts = await slotCounts(rows.map((row) => row.sellerId));
  return rows.map((row) => publicStudio(row, counts.get(row.sellerId) ?? 0));
}

export async function getCreatorStudio(id: string) {
  const row = await db.creatorStudio.findUnique({ where: { id }, select: studioSelect });
  if (!row) return null;
  const counts = await slotCounts([row.sellerId]);
  return publicStudio(row, counts.get(row.sellerId) ?? 0);
}

export async function getMyCreatorStudio(sellerId: string) {
  const row = await db.creatorStudio.findUnique({ where: { sellerId }, select: studioSelect });
  if (!row) return null;
  const counts = await slotCounts([sellerId]);
  return publicStudio(row, counts.get(sellerId) ?? 0);
}

export async function saveCreatorStudio(sellerId: string, username: string, raw: StudioInput) {
  const parsed = parseStudioInput(raw);
  if ("error" in parsed) return parsed;
  const label = `MoCoMo · ${username}`.slice(0, 48);
  const coverUrl = await watermarkPortfolioUrl(parsed.value.coverUrl || "", label, sellerId).catch(
    () => parsed.value.coverUrl || ""
  );
  const blocks: StudioPortfolioBlock[] = [];
  for (const block of parsed.value.blocks ?? []) {
    if (block.type === "image") {
      const url = await watermarkPortfolioUrl(block.url, label, sellerId).catch(() => block.url);
      blocks.push({ ...block, url });
    } else {
      blocks.push(block);
    }
  }
  const stored: StudioPortfolioDoc = storeStudioPortfolio({ version: 2, coverUrl, blocks });
  const data = {
    category: parsed.value.category,
    title: parsed.value.title,
    about: parsed.value.about,
    open: parsed.value.open,
    slotCap: parsed.value.slotCap,
    deliveryDays: parsed.value.deliveryDays,
    revisionNote: parsed.value.revisionNote,
    currency: parsed.value.currency,
    portfolio: stored as unknown as Prisma.InputJsonValue,
    tiers: parsed.value.tiers as unknown as Prisma.InputJsonValue,
    addons: parsed.value.addons as unknown as Prisma.InputJsonValue,
    formFields: parsed.value.formFields as unknown as Prisma.InputJsonValue,
  };
  const row = await db.creatorStudio.upsert({
    where: { sellerId },
    create: { sellerId, ...data },
    update: data,
    select: studioSelect,
  });
  const counts = await slotCounts([sellerId]);
  return { studio: publicStudio(row, counts.get(sellerId) ?? 0) };
}

async function ensureCommissionRoom(sellerId: string, buyerId: string) {
  const existing = await db.chatRoom.findFirst({
    where: {
      type: "DM",
      AND: [{ members: { some: { userId: sellerId } } }, { members: { some: { userId: buyerId } } }],
    },
    select: { id: true },
  });
  if (existing) return existing.id;
  const room = await db.chatRoom.create({
    data: {
      type: "DM",
      members: { create: [{ userId: sellerId, role: "owner" }, { userId: buyerId, role: "member" }] },
    },
    select: { id: true },
  });
  return room.id;
}

export async function placeStudioOrder(
  buyerId: string,
  studioId: string,
  input: { tierId: string; addonIds: string[]; answers: Record<string, string>; agreed: boolean }
) {
  if (!input.agreed) return { error: "Agree to the revision rules and the no-cancel terms." as const };
  const studio = await getCreatorStudio(studioId);
  if (!studio) return { error: "Studio not found." as const };
  if (studio.sellerId === buyerId) return { error: "You cannot order your own studio." as const };
  if (!studio.accepting) return { error: "This studio is full. Join the waitlist." as const };
  const quote = quoteStudio(studio.tiers, studio.addons, input.tierId, input.addonIds);
  if (!quote) return { error: "Choose a price tier." as const };

  const answers: Record<string, string> = {};
  const referenceUrls: string[] = [];
  for (const field of studio.formFields) {
    const value = (input.answers[field.id] || "").trim().slice(0, 2000);
    if (field.required && value.length < (field.kind === "image" ? 8 : 2)) {
      return { error: `Fill in ${field.label}.` as const };
    }
    if (!value) continue;
    answers[field.id] = value;
    if (field.kind === "image" && value.startsWith("https://")) referenceUrls.push(value);
  }

  const brief = [
    `${studio.title} · ${quote.tier.name}`,
    ...quote.addons.map((addon) => `+ ${addon.name}`),
    ...studio.formFields.map((field) => (answers[field.id] ? `${field.label}: ${answers[field.id]}` : "")),
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 4000);

  const created = await createMobileUsedListing(studio.sellerId, {
    title: `${studio.title} · ${quote.tier.name}`.slice(0, 80),
    description: `${studio.revisionNote}\n\n${brief}`.slice(0, 4000),
    price: quote.total,
    currency: studio.currency,
    category: "DIGITAL",
    categories: ["DIGITAL"],
    region: "Shipping",
    images: [studio.coverUrl, ...studio.blocks.filter((block) => block.type === "image").map((block) => block.url)]
      .filter(Boolean)
      .slice(0, 6),
    saleType: "FIXED",
    productType: "ILLUSTRATION",
    digitalKind: "commission",
    tradeMode: "SELL",
  });
  if ("error" in created && created.error) return { error: created.error };
  if (!("listingId" in created) || !created.listingId) return { error: "Could not open the commission." as const };

  const roomId = await ensureCommissionRoom(studio.sellerId, buyerId);
  await db.usedListingChat.upsert({
    where: { listingId_buyerId: { listingId: created.listingId, buyerId } },
    create: { listingId: created.listingId, roomId, buyerId },
    update: { roomId },
  });
  await db.message.create({
    data: {
      roomId,
      senderId: buyerId,
      content: `Commission request\n${brief}\n\nRevisions: ${studio.revisionNote}\nDelivery window: ${studio.deliveryDays} days after payment.`,
    },
  });
  const commission = await db.digitalCommission.create({
    data: {
      buyerId,
      sellerId: studio.sellerId,
      studioId: studio.id,
      brief,
      purpose: "personal",
      referenceUrls,
      status: "ACCEPTED",
      price: quote.total,
      currency: studio.currency,
      estimatedDays: studio.deliveryDays,
      listingId: created.listingId,
      roomId,
      orderMeta: {
        tierId: quote.tier.id,
        tierName: quote.tier.name,
        addonIds: quote.addons.map((addon) => addon.id),
        answers,
      },
    },
    select: { id: true },
  });
  return { id: commission.id, listingId: created.listingId, roomId, price: quote.total };
}

export async function joinStudioWaitlist(userId: string, studioId: string) {
  const studio = await getCreatorStudio(studioId);
  if (!studio) return { error: "Studio not found." as const };
  if (studio.sellerId === userId) return { error: "This is your studio." as const };
  if (studio.accepting) return { error: "This studio is still open. Place an order." as const };
  await db.studioWaitlist.upsert({
    where: { studioId_userId: { studioId, userId } },
    create: { studioId, userId },
    update: {},
  });
  return { ok: true as const };
}

export async function requestLateStudioCancel(userId: string, commissionId: string) {
  const row = await db.digitalCommission.findUnique({ where: { id: commissionId } });
  if (!row || row.buyerId !== userId || !row.listingId || !row.estimatedDays) {
    return { error: "Request not found." as const };
  }
  if (CLOSED_ORDER.includes(row.status)) return { error: "This order is already closed." as const };
  const order = await db.marketplaceOrder.findFirst({
    where: { usedListingId: row.listingId, buyerId: userId },
  });
  if (!order || order.status === "AWAITING_PAYMENT") {
    return { error: "The delivery window starts after payment." as const };
  }
  const deadline = order.createdAt.getTime() + row.estimatedDays * 24 * 60 * 60 * 1000;
  if (Date.now() < deadline) return { error: "The delivery window is still open." as const };
  const listing = await db.usedListing.findUnique({
    where: { id: row.listingId },
    select: { subcultureMeta: true },
  });
  const delivery = readDigitalDelivery(listing?.subcultureMeta);
  if (delivery && (delivery.status === "uploaded" || delivery.status === "completed")) {
    return { error: "The file is already delivered. Open a dispute from the delivery room." as const };
  }
  if (delivery && listing) {
    const base =
      listing.subcultureMeta && typeof listing.subcultureMeta === "object" && !Array.isArray(listing.subcultureMeta)
        ? { ...(listing.subcultureMeta as Record<string, unknown>) }
        : {};
    base.digitalDelivery = { ...delivery, disputed: true };
    await db.usedListing.update({
      where: { id: row.listingId },
      data: { subcultureMeta: base as Prisma.InputJsonValue },
    });
  }
  await db.digitalCommission.update({
    where: { id: row.id },
    data: { status: "LATE_CANCEL", disputeReason: "Delivery window passed before the file was uploaded." },
  });
  if (!["CANCELLED", "REFUNDED", "CONFIRMED", "REFUND_REQUESTED"].includes(order.status)) {
    await db.marketplaceRefund.create({
      data: {
        orderId: order.id,
        requesterId: userId,
        reason: "Creator missed the delivery window before upload.",
        amount: order.subtotalAmount + order.shippingAmount,
        status: "REQUESTED",
      },
    });
    await db.marketplaceOrder.update({
      where: { id: order.id },
      data: { status: "REFUND_REQUESTED" },
    });
  }
  return { ok: true as const };
}
