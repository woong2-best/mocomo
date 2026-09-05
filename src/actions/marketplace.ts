"use server";

import { revalidatePath } from "next/cache";
import type {
  MarketplaceListingType,
  MarketplaceShippingFeeType,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { assertSettlementAccount, settlementRequiredResult } from "@/lib/settlement-account";
import { assertAdultContentNotMonetized } from "@/lib/adult-monetization-ban";
import {
  assertCanPublishNsfwContent,
  nsfwViewerSelect,
} from "@/lib/nsfw-viewer-access";
import {
  MARKETPLACE_CATEGORIES,
  listingTypeLabel,
} from "@/lib/marketplace/constants";
import { validateShipToCountries } from "@/lib/marketplace/shipping-config";
import {
  refreshSellerConnectLink,
  startSellerConnectOnboarding,
  syncStripeConnectOnboardedAt,
} from "@/lib/stripe-connect";
import { normalizeSellerCountry } from "@/lib/marketplace/seller-region-policy";
import { isValidProductType, normalizeWorkTitle, compactWorkKey } from "@/lib/used-catalog";
import { normalizeSubcultureListingInput } from "@/lib/subculture-commerce/normalize";
import { resolveAnimeSlugFromWorkTitle } from "@/lib/subculture-commerce/anime-suggest";
import type { SubcultureListingInput } from "@/lib/subculture-commerce/types";

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
  return requireMarketplaceSellerForUser(user.id);
}

export async function requireMarketplaceSellerForUser(userId: string) {
  const profile = await db.marketplaceSellerProfile.findUnique({
    where: { userId },
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
  return { user: { id: userId }, profile };
}

/** /market/sell-item — 판매자 온보딩·승인 완료 전 접근 차단 */
export type MarketplaceSellItemGate =
  | { allowed: true }
  | { allowed: false; redirectTo: string };

export async function getMarketplaceSellItemGate(userId: string): Promise<MarketplaceSellItemGate> {
  const profile = await db.marketplaceSellerProfile.findUnique({
    where: { userId },
  });
  if (!profile) {
    return { allowed: false, redirectTo: "/market/seller/register?callbackUrl=/market/sell-item" };
  }
  if (!profile.onboardingCompletedAt && profile.onboardingStep !== "COMPLETE") {
    return { allowed: false, redirectTo: "/market/seller/register?callbackUrl=/market/sell-item" };
  }
  if (
    profile.status === "SUSPENDED" ||
    profile.status === "REJECTED" ||
    profile.sanctionLevel === "PERMANENT_BAN" ||
    profile.sanctionLevel === "SALES_SUSPENDED" ||
    !profile.canList ||
    profile.status !== "APPROVED"
  ) {
    return { allowed: false, redirectTo: "/market/seller" };
  }
  return { allowed: true };
}

export async function startMarketplaceConnectOnboarding() {
  const { user } = await requireMarketplaceSeller();
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      stripeConnectAccountId: true,
      countryCode: true,
      marketplaceSeller: { select: { sellingMarket: true } },
    },
  });
  if (!dbUser) return { error: "사용자를 찾을 수 없습니다." };

  const country = normalizeSellerCountry(
    dbUser.marketplaceSeller?.sellingMarket || dbUser.countryCode
  );

  const result = await startSellerConnectOnboarding({
    userId: dbUser.id,
    email: dbUser.email,
    stripeConnectAccountId: dbUser.stripeConnectAccountId,
    countryCode: country,
  });
  if ("error" in result) return result;

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
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { stripeConnectAccountId: true },
  });
  if (dbUser?.stripeConnectAccountId) {
    await syncStripeConnectOnboardedAt(user.id, dbUser.stripeConnectAccountId);
  }
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
  contentRating?: import("@prisma/client").ContentRating;
  isNsfw?: boolean;
} & SubcultureListingInput;

export async function createMarketplaceListing(input: CreateMarketplaceListingInput) {
  const user = await requireAuth();
  return createMarketplaceListingForUser(user.id, input);
}

export async function createMarketplaceListingForUser(
  userId: string,
  input: CreateMarketplaceListingInput
) {
  let user;
  let profile;
  try {
    ({ user, profile } = await requireMarketplaceSellerForUser(userId));
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

  const sellerUser = await db.user.findUnique({
    where: { id: userId },
    select: { bankVerifiedAt: true, phoneVerified: true, countryCode: true },
  });
  const settlementErr = assertSettlementAccount(sellerUser);
  if (settlementErr) {
    return settlementRequiredResult("/market/sell-item");
  }

  if (!MARKETPLACE_CATEGORIES.includes(input.category as (typeof MARKETPLACE_CATEGORIES)[number])) {
    return { error: "카테고리를 선택해 주세요." };
  }
  if (!Number.isFinite(input.priceAmount) || input.priceAmount < 0) {
    return { error: "가격이 올바르지 않습니다." };
  }

  const listingRating = input.contentRating ?? (input.isNsfw ? "ADULT" : "GENERAL");
  const adultListingErr = assertAdultContentNotMonetized(listingRating, {
    hasPrice: input.priceAmount > 0,
  });
  if (adultListingErr) return { error: adultListingErr };

  if (listingRating === "ADULT" || input.isNsfw) {
    const nsfwUser = await db.user.findUnique({
      where: { id: user.id },
      select: nsfwViewerSelect,
    });
    const publishErr = assertCanPublishNsfwContent(
      nsfwUser ?? { id: user.id, birthDate: null },
      true
    );
    if (publishErr) return { error: publishErr };
  }

  if (input.type === "DIGITAL") {
    return { error: "디지털 상품 등록은 지원하지 않습니다." };
  }
  if (input.type === "CUSTOM_ORDER" && (!input.productionDays || input.productionDays < 1)) {
    return { error: "주문제작 상품은 제작기간(일)이 필요합니다." };
  }

  const validated = validateShipToCountries(input.shipToCountries);
  if (!validated.ok) return { error: validated.error };
  const shipToCountries = validated.countries;

  const mediaUrls = (input.mediaUrls ?? []).filter(Boolean).slice(0, 12);
  const coverUrl = input.coverUrl || mediaUrls[0] || null;
  const publish = input.publish !== false;
  const subculture = normalizeSubcultureListingInput(input);
  const normalizedWork = normalizeWorkTitle(input.workTitle);
  const animeSlug =
    subculture.animeSlug ?? (await resolveAnimeSlugFromWorkTitle(normalizedWork));

  const listing = await db.marketplaceListing.create({
    data: {
      sellerId: user.id,
      sellerProfileId: profile.id,
      title,
      description,
      type: input.type,
      category: input.category,
      tags: (input.tags ?? []).map((t) => t.trim()).filter(Boolean).slice(0, 20),
      workTitle: normalizedWork,
      animeSlug,
      productType:
        input.productType?.trim() && isValidProductType(input.productType.trim())
          ? input.productType.trim()
          : null,
      characterName: subculture.characterName,
      conditionGrade: subculture.conditionGrade,
      limitedKind: subculture.limitedKind,
      listingFormat: subculture.listingFormat,
      tradeMode: subculture.tradeMode,
      itemOrigin: subculture.itemOrigin,
      packagingState: subculture.packagingState,
      subcultureMeta: subculture.subcultureMeta
        ? (subculture.subcultureMeta as Prisma.InputJsonValue)
        : undefined,
      priceAmount: Math.floor(input.priceAmount),
      currency: (input.currency ?? "usd").toLowerCase(),
      stock: Math.max(0, Math.floor(input.stock ?? 1)),
      options: input.options ? (input.options as Prisma.InputJsonValue) : undefined,
      status: publish ? "ACTIVE" : "DRAFT",
      coverUrl,
      productionDays: input.productionDays ?? null,
      digitalFileUrl: null,
      shippingMethods: (input.shippingMethods ?? ["INTL_EMS"]).slice(0, 12),
      shippingFeeType: input.shippingFeeType ?? "FIXED",
      shippingFeeFixed: Math.max(0, input.shippingFeeFixed ?? 0),
      shipToCountries,
      shipsWorldwide: false,
      contentRating: input.contentRating ?? (input.isNsfw ? "ADULT" : "GENERAL"),
      isNsfw: (input.contentRating ?? (input.isNsfw ? "ADULT" : "GENERAL")) === "ADULT",
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
  work?: string;
  product?: string;
  take?: number;
  cursor?: string;
}) {
  const take = Math.min(params?.take ?? 24, 48);
  const where: Prisma.MarketplaceListingWhereInput = {
    status: "ACTIVE",
  };
  if (params?.type && params.type !== "ALL") {
    where.type = params.type;
  } else {
    where.type = { not: "DIGITAL" };
  }
  if (params?.category) where.category = params.category;
  const andFilters: Prisma.MarketplaceListingWhereInput[] = [];
  const workCompact = compactWorkKey(params?.work);
  if (workCompact) {
    andFilters.push({
      OR: [
        { workTitle: { contains: workCompact, mode: "insensitive" } },
        { title: { contains: workCompact, mode: "insensitive" } },
      ],
    });
  }
  if (params?.product?.trim() && isValidProductType(params.product.trim())) {
    where.productType = params.product.trim();
  }
  if (params?.q?.trim()) {
    const q = params.q.trim();
    andFilters.push({
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { tags: { has: q } },
      ],
    });
  }
  if (andFilters.length) where.AND = andFilters;

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
      workTitle: true,
      productType: true,
      characterName: true,
      conditionGrade: true,
      limitedKind: true,
      tradeMode: true,
      listingFormat: true,
      itemOrigin: true,
      packagingState: true,
      subcultureMeta: true,
      isNsfw: true,
      sellerId: true,
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
