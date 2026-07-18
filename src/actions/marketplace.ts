"use server";

import { revalidatePath } from "next/cache";
import type {
  MarketplaceListingType,
  MarketplaceShippingFeeType,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import {
  MARKETPLACE_CATEGORIES,
  listingTypeLabel,
} from "@/lib/marketplace/constants";
import { validateShipToCountries } from "@/lib/marketplace/shipping-config";
import {
  createSellerConnectOnboarding,
  refreshSellerConnectLink,
} from "@/lib/stripe-connect";

export async function getMarketplaceSellerProfile(userId?: string) {
  const user = userId
    ? { id: userId }
    : await requireAuth({ writeKind: "notification" }).catch(() => null);
  if (!user) return null;
  return db.marketplaceSellerProfile.findUnique({
    where: { userId: user.id },
    include: {
      user: { select: { username: true, image: true, stripeConnectAccountId: true, stripeConnectOnboardedAt: true } },
    },
  });
}

export async function applyMarketplaceSeller(input: {
  displayName: string;
  bio?: string;
  applyReason?: string;
  snsLinks?: Record<string, string>;
}) {
  const user = await requireAuth();
  const displayName = input.displayName.trim().slice(0, 80);
  if (!displayName) return { error: "판매자 닉네임을 입력해 주세요." };

  const existing = await db.marketplaceSellerProfile.findUnique({
    where: { userId: user.id },
  });
  if (existing?.status === "APPROVED") {
    return { error: "이미 승인된 판매자입니다." };
  }
  if (existing?.status === "PENDING") {
    return { error: "판매자 신청이 검토 중입니다." };
  }

  const profile = await db.marketplaceSellerProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      displayName,
      bio: input.bio?.trim().slice(0, 2000) || null,
      applyReason: input.applyReason?.trim().slice(0, 2000) || null,
      snsLinks: (input.snsLinks ?? undefined) as Prisma.InputJsonValue | undefined,
      status: "PENDING",
    },
    update: {
      displayName,
      bio: input.bio?.trim().slice(0, 2000) || null,
      applyReason: input.applyReason?.trim().slice(0, 2000) || null,
      snsLinks: (input.snsLinks ?? undefined) as Prisma.InputJsonValue | undefined,
      status: "PENDING",
    },
  });

  revalidatePath("/market/seller");
  return { success: true as const, profileId: profile.id };
}

/**
 * 판매 등록·주문 처리용 — 관리자 APPROVED + canList 만 허용.
 * PENDING은 자동 승인하지 않음.
 */
export async function requireMarketplaceSeller() {
  const user = await requireAuth();
  const profile = await db.marketplaceSellerProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) {
    throw new Error("SELLER_REQUIRED");
  }
  if (profile.status === "SUSPENDED" || profile.status === "REJECTED") {
    throw new Error("SELLER_BLOCKED");
  }
  if (
    profile.sanctionLevel === "PERMANENT_BAN" ||
    profile.sanctionLevel === "SALES_SUSPENDED" ||
    !profile.canList
  ) {
    throw new Error("SELLER_BLOCKED");
  }
  if (profile.status !== "APPROVED") {
    throw new Error("SELLER_PENDING_APPROVAL");
  }
  return { user, profile };
}

export async function startMarketplaceConnectOnboarding() {
  const { user } = await requireMarketplaceSeller();
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, stripeConnectAccountId: true },
  });
  if (!dbUser) return { error: "사용자를 찾을 수 없습니다." };

  const result = await createSellerConnectOnboarding(dbUser);
  if ("error" in result) return result;

  if (result.accountId !== dbUser.stripeConnectAccountId) {
    await db.user.update({
      where: { id: user.id },
      data: { stripeConnectAccountId: result.accountId },
    });
  }

  return { url: result.url };
}

export async function resumeMarketplaceConnectOnboarding() {
  const user = await requireAuth();
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { stripeConnectAccountId: true },
  });
  if (!dbUser?.stripeConnectAccountId) {
    return startMarketplaceConnectOnboarding();
  }
  const result = await refreshSellerConnectLink(dbUser.stripeConnectAccountId);
  if ("error" in result) return result;
  return { url: result.url };
}

export async function markMarketplaceConnectComplete() {
  const user = await requireAuth();
  await db.user.update({
    where: { id: user.id },
    data: { stripeConnectOnboardedAt: new Date() },
  });
  revalidatePath("/market/seller");
  return { success: true as const };
}

export type CreateMarketplaceListingInput = {
  title: string;
  description: string;
  type: MarketplaceListingType;
  category: string;
  tags?: string[];
  priceAmount: number;
  currency?: string;
  stock?: number;
  options?: { name: string; values: string[] }[];
  coverUrl?: string;
  mediaUrls?: string[];
  productionDays?: number;
  digitalFileUrl?: string;
  shippingMethods?: string[];
  shippingFeeType?: MarketplaceShippingFeeType;
  shippingFeeFixed?: number;
  /** Physical/custom/preorder: required subset of KR/US/JP/CN */
  shipToCountries?: string[];
  shipsWorldwide?: boolean;
  publish?: boolean;
};

export async function createMarketplaceListing(input: CreateMarketplaceListingInput) {
  let user;
  let profile;
  try {
    ({ user, profile } = await requireMarketplaceSeller());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "SELLER_PENDING_APPROVAL") {
      return { error: "관리자 승인 대기 중입니다. 승인 후 상품을 등록할 수 있습니다." };
    }
    if (msg === "SELLER_REQUIRED") {
      return { error: "판매자 가입이 필요합니다." };
    }
    return { error: "판매가 제한되었거나 판매자 등록이 필요합니다." };
  }

  const title = input.title.trim().slice(0, 120);
  const description = input.description.trim().slice(0, 10_000);
  if (!title || !description) return { error: "제목과 설명을 입력해 주세요." };
  if (!MARKETPLACE_CATEGORIES.includes(input.category as (typeof MARKETPLACE_CATEGORIES)[number])) {
    return { error: "카테고리를 선택해 주세요." };
  }
  if (!Number.isFinite(input.priceAmount) || input.priceAmount < 0) {
    return { error: "가격이 올바르지 않습니다." };
  }
  if (input.type === "CUSTOM_ORDER" && (!input.productionDays || input.productionDays < 1)) {
    return { error: "주문제작 상품은 제작기간(일)이 필요합니다." };
  }

  const needsPhysicalShip = input.type !== "DIGITAL";
  let shipToCountries: string[] = [];
  if (needsPhysicalShip) {
    const validated = validateShipToCountries(input.shipToCountries);
    if (!validated.ok) return { error: validated.error };
    shipToCountries = validated.countries;
  }

  const mediaUrls = (input.mediaUrls ?? []).filter(Boolean).slice(0, 12);
  const coverUrl = input.coverUrl || mediaUrls[0] || null;
  const publish = input.publish !== false;

  const listing = await db.marketplaceListing.create({
    data: {
      sellerId: user.id,
      sellerProfileId: profile.id,
      title,
      description,
      type: input.type,
      category: input.category,
      tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 20),
      priceAmount: Math.floor(input.priceAmount),
      currency: (input.currency ?? "krw").toLowerCase(),
      stock: Math.max(0, Math.floor(input.stock ?? 1)),
      options: input.options ? (input.options as Prisma.InputJsonValue) : undefined,
      status: publish ? "ACTIVE" : "DRAFT",
      coverUrl,
      productionDays: input.productionDays ?? null,
      digitalFileUrl: input.type === "DIGITAL" ? input.digitalFileUrl ?? null : null,
      shippingMethods:
        input.type === "DIGITAL"
          ? ["DIGITAL_NONE"]
          : (input.shippingMethods ?? ["INTL_EMS"]).slice(0, 12),
      shippingFeeType: input.type === "DIGITAL" ? "FREE" : input.shippingFeeType ?? "FIXED",
      shippingFeeFixed: input.type === "DIGITAL" ? 0 : Math.max(0, input.shippingFeeFixed ?? 0),
      shipToCountries,
      shipsWorldwide: false,
      publishedAt: publish ? new Date() : null,
      media: mediaUrls.length
        ? {
            create: mediaUrls.map((url, i) => ({
              url,
              type: url.match(/\.(mp4|webm|mov)(\?|$)/i) ? "VIDEO" : "IMAGE",
              sortOrder: i,
            })),
          }
        : undefined,
    },
  });

  revalidatePath("/market");
  revalidatePath("/market/listings");
  revalidatePath("/market/seller");
  return { success: true as const, listingId: listing.id, typeLabel: listingTypeLabel(listing.type) };
}

export async function listMarketplaceListings(params?: {
  type?: MarketplaceListingType | "ALL";
  category?: string;
  q?: string;
  take?: number;
  cursor?: string;
}) {
  const take = Math.min(params?.take ?? 24, 48);
  const where: Prisma.MarketplaceListingWhereInput = {
    status: "ACTIVE",
  };
  if (params?.type && params.type !== "ALL") where.type = params.type;
  if (params?.category) where.category = params.category;
  if (params?.q?.trim()) {
    const q = params.q.trim();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { tags: { has: q } },
    ];
  }

  const rows = await db.marketplaceListing.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: take + 1,
    ...(params?.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
    select: {
      id: true,
      title: true,
      type: true,
      category: true,
      priceAmount: true,
      currency: true,
      coverUrl: true,
      stock: true,
      productionDays: true,
      favoriteCount: true,
      salesCount: true,
      createdAt: true,
      seller: { select: { id: true, username: true, image: true } },
      sellerProfile: { select: { displayName: true, ratingAvg: true, salesCount: true } },
    },
  });

  const nextCursor = rows.length > take ? rows[take]?.id ?? null : null;
  return { items: rows.slice(0, take), nextCursor };
}

export async function getMarketplaceListing(id: string) {
  const listing = await db.marketplaceListing.findUnique({
    where: { id },
    include: {
      media: { orderBy: { sortOrder: "asc" } },
      seller: { select: { id: true, username: true, image: true, name: true } },
      sellerProfile: true,
      reviews: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: { author: { select: { username: true, image: true } } },
      },
    },
  });
  if (!listing || listing.status === "REMOVED") return null;

  void db.marketplaceListing
    .update({ where: { id }, data: { viewCount: { increment: 1 } } })
    .catch(() => null);

  return listing;
}

export async function toggleMarketplaceFavorite(listingId: string) {
  const user = await requireAuth();
  const existing = await db.marketplaceFavorite.findUnique({
    where: { userId_listingId: { userId: user.id, listingId } },
  });
  if (existing) {
    await db.$transaction([
      db.marketplaceFavorite.delete({ where: { id: existing.id } }),
      db.marketplaceListing.update({
        where: { id: listingId },
        data: { favoriteCount: { decrement: 1 } },
      }),
    ]);
    return { favorited: false };
  }
  await db.$transaction([
    db.marketplaceFavorite.create({ data: { userId: user.id, listingId } }),
    db.marketplaceListing.update({
      where: { id: listingId },
      data: { favoriteCount: { increment: 1 } },
    }),
  ]);
  return { favorited: true };
}

export async function listMyMarketplaceListings() {
  const user = await requireAuth();
  return db.marketplaceListing.findMany({
    where: { sellerId: user.id, status: { not: "REMOVED" } },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      priceAmount: true,
      currency: true,
      stock: true,
      salesCount: true,
      coverUrl: true,
      updatedAt: true,
    },
  });
}
