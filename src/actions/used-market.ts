import { createTranslator } from "@/lib/i18n/messages";
const t = createTranslator("en");

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getOrCreateDM, sendMessage } from "@/actions/chat";
import {
  Prisma,
  type UsedListingCategory,
  type UsedListingStatus,
  type UsedRestrictedKind,
  type SubcultureConditionGrade,
  type SubcultureLimitedKind,
  type SubcultureTradeMode,
} from "@prisma/client";
import {
  isUsedShippingRegion,
  isValidUsedRegion as validateUsedRegion,
} from "@/lib/used-regions-global";
import { finalizeExpiredAuctionIfNeeded } from "@/actions/used-auction";
import {
  processNegotiationTimeout,
  processPaymentReminders,
  processPaymentTimeout,
} from "@/lib/used-auction-lifecycle";
import {
  defaultBidIncrement,
  isAuctionLive,
  standardAuctionEndsAt,
} from "@/lib/used-auction";
import { USED_AUCTION_RETIRED, USED_AUCTION_RETIRED_MSG } from "@/lib/retired-product-features";
import {
  maxUsedListingPrice,
  maxUsedListingPriceLabel,
  normalizeUsedCurrency,
  formatUsedPrice,
  usedBrowseCategoryWhere,
} from "@/lib/used-market";
import {
  compactWorkKey,
  isValidProductType,
  normalizeWorkTitle,
} from "@/lib/used-catalog";
import { normalizeSubcultureListingInput } from "@/lib/subculture-commerce/normalize";
import { mergeExtraCategories, parseUsedSellCategories } from "@/lib/used-listing-categories";
import type { SubcultureListingInput } from "@/lib/subculture-commerce/types";
import { resolveAnimeSlugFromWorkTitle } from "@/lib/subculture-commerce/anime-suggest";
import { notifyWtbAlertsForListing } from "@/lib/subculture-commerce/wtb-alerts";
import { finalizeUsedListingSold } from "@/lib/subculture-commerce/sale-records";
import { geocodeMeetQuery } from "@/lib/maps/geocode";
import { normalizeMeetCountry } from "@/lib/maps/select-engine";
import { assertAuctionPostAccess, assertUsedMarketAccess } from "@/lib/used-market-access";
import {
  AUCTION_SELLER_DEPOSIT_ERROR,
  canParticipateInAuction,
  getMocoBalanceSnapshot,
  lockSellerDepositInTransaction,
  mapDepositError,
  releaseAllListingDepositsExcept,
} from "@/lib/auction-deposit";
import { confirmAuctionTradeComplete } from "@/lib/used-auction-trade-complete";
import { assertAdultContentNotMonetized } from "@/lib/adult-monetization-ban";
import { assertCanPublishNsfwContent, nsfwViewerSelect } from "@/lib/nsfw-viewer-access";
import {
  assertUsedAdultForRestricted,
  isUsedAdultVerified,
  isUsedRestrictedKind,
  USED_ADULT_SELLER_MSG,
} from "@/lib/used-youth-protection";
import {
  assertUsedMarketListingVisible,
  assertUsedMarketTradeAccess,
  buildScopedUsedListingWhere,
  resolveUsedMarketScope,
} from "@/lib/used-market-locale-scope";

export async function isUsedDbReady() {
  try {
    await db.usedListing.findFirst({ select: { id: true } });
    return true;
  } catch {
    return false;
  }
}

export async function getUsedListings(
  params?: {
    q?: string;
    category?: string;
    region?: string;
    /** @deprecated ignored — viewer country is enforced server-side */
    country?: string;
    /** @deprecated use options.viewerId */
    viewerCountryCode?: string;
    /** 시·도 — 서비스 지역 내에서만 적용 */
    sido?: string;
    status?: UsedListingStatus;
    sellerId?: string;
    take?: number;
    saleType?: "FIXED" | "AUCTION";
    liveAuctionOnly?: boolean;
    work?: string;
    product?: string;
    condition?: string;
    limited?: string;
    trade?: string;
    anime?: string;
  },
  options?: { viewerId?: string | null; sessionCountry?: string | null }
) {
  const status = params?.status ?? "SELLING";
  if (
    USED_AUCTION_RETIRED &&
    !params?.sellerId &&
    (params?.liveAuctionOnly || params?.saleType === "AUCTION")
  ) {
    return [];
  }
  const locality = await resolveUsedMarketScope({
    userId: options?.viewerId,
    sessionCountry: options?.sessionCountry ?? params?.viewerCountryCode ?? null,
  });
  const andFilters: Prisma.UsedListingWhereInput[] = [
    buildScopedUsedListingWhere(locality, {
      region: params?.region,
      sido: params?.sido,
    }),
    { status },
  ];

  if (params?.saleType) andFilters.push({ saleType: params.saleType });
  else if (USED_AUCTION_RETIRED && !params?.sellerId) andFilters.push({ saleType: "FIXED" });

  if (params?.liveAuctionOnly) {
    andFilters.push({
      saleType: "AUCTION",
      auctionEndsAt: { gt: new Date() },
      OR: [{ auctionState: "LIVE" }, { auctionState: null }],
    });
  }

  if (params?.category) {
    const browseWhere = usedBrowseCategoryWhere(params.category);
    if (browseWhere) andFilters.push(browseWhere);
    else andFilters.push({ category: params.category as UsedListingCategory });
  }

  const workCompact = compactWorkKey(params?.work);
  if (params?.anime?.trim()) {
    andFilters.push({ animeSlug: params.anime.trim() });
  } else if (workCompact) {
    andFilters.push({
      OR: [
        { workTitle: { contains: workCompact, mode: "insensitive" } },
        { title: { contains: workCompact, mode: "insensitive" } },
      ],
    });
  }

  if (params?.product?.trim() && isValidProductType(params.product.trim())) {
    andFilters.push({ productType: params.product.trim() });
  }
  if (params?.condition?.trim()) {
    andFilters.push({ conditionGrade: params.condition.trim() as SubcultureConditionGrade });
  }
  if (params?.limited?.trim()) {
    andFilters.push({ limitedKind: params.limited.trim() as SubcultureLimitedKind });
  }
  if (params?.trade?.trim()) {
    andFilters.push({ tradeMode: params.trade.trim() as SubcultureTradeMode });
  }
  if (params?.sellerId) andFilters.push({ sellerId: params.sellerId });
  if (params?.q?.trim()) {
    andFilters.push({
      OR: [
        { title: { contains: params.q.trim(), mode: "insensitive" } },
        { description: { contains: params.q.trim(), mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.UsedListingWhereInput = { AND: andFilters };

  const orderBy: Prisma.UsedListingOrderByWithRelationInput[] = params?.liveAuctionOnly
    ? [{ auctionEndsAt: "asc" }, { createdAt: "desc" }]
    : [{ createdAt: "desc" }];

  try {
    return await db.usedListing.findMany({
      where,
      orderBy,
      take: params?.take ?? 48,
      include: {
        seller: {
          select: {
            id: true,
            username: true,
            image: true,
            name: true,
            supportTierSent: true,
          },
        },
        _count: { select: { favorites: true } },
      },
    });
  } catch {
    return [];
  }
}

export async function getViewerUsedListingStarIds(userId: string, listingIds: string[]) {
  if (listingIds.length === 0) return [] as string[];
  const rows = await db.usedListingStar.findMany({
    where: { userId, listingId: { in: listingIds } },
    select: { listingId: true },
  });
  return rows.map((row) => row.listingId);
}

export async function confirmUsedAuctionTrade(listingId: string) {
  const user = await requireAuth();
  const result = await confirmAuctionTradeComplete(user.id, listingId);
  if (!("error" in result)) {
    revalidatePath(`/market/${listingId}`);
    revalidatePath("/market/my");
    revalidatePath("/market");
  }
  return result;
}

export async function getUsedListing(id: string, viewerId?: string) {
  try {
    let listing;
    try {
      listing = await db.usedListing.findUnique({
        where: { id },
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              image: true,
              name: true,
              createdAt: true,
              supportTierSent: true,
            },
          },
          currentBidder: {
            select: { id: true, username: true, image: true, name: true },
          },
          _count: { select: { favorites: true, tradeChats: true } },
        },
      });
    } catch {
      listing = await db.usedListing.findUnique({
        where: { id },
        include: {
          seller: {
            select: {
              id: true,
              username: true,
              image: true,
              name: true,
              createdAt: true,
              supportTierSent: true,
            },
          },
          _count: { select: { favorites: true } },
        },
      });
    }
    if (!listing) return null;

    if (
      (listing.meetLat == null || listing.meetLng == null) &&
      listing.meetPlace?.trim() &&
      !isUsedShippingRegion(listing.region) &&
      !listing.region.includes("Shipping")
    ) {
      void geocodeMeetQuery({
        country: listing.meetCountry ?? "KR",
        region: listing.region,
        place: listing.meetPlace.trim(),
      })
        .then(async (geo) => {
          if (!geo) return;
          await db.usedListing.update({
            where: { id },
            data: { meetLat: geo.lat, meetLng: geo.lng },
          });
        })
        .catch(() => undefined);
    }

    const visibilityErr = await assertUsedMarketListingVisible({
      userId: viewerId,
      listing,
    });
    if (visibilityErr) return null;

    const isAuction = listing.saleType === "AUCTION";
    const auctionExpired =
      isAuction &&
      listing.auctionEndsAt &&
      listing.auctionEndsAt.getTime() <= Date.now() &&
      (listing.auctionState === "LIVE" || listing.auctionState === null);
    if (auctionExpired) {
      void finalizeExpiredAuctionIfNeeded(id);
    }
    if (
      listing.auctionState === "PAYMENT_PENDING" &&
      listing.paymentDueAt &&
      listing.paymentDueAt.getTime() <= Date.now() &&
      !listing.paymentTimeoutProcessed
    ) {
      void processPaymentTimeout(id);
    } else if (listing.auctionState === "PAYMENT_PENDING" && listing.paymentDueAt) {
      void processPaymentReminders(id);
    }
    if (
      listing.auctionState === "PRICE_NEGOTIATION" &&
      listing.negotiationDueAt &&
      listing.negotiationDueAt.getTime() <= Date.now() &&
      !listing.negotiationTimeoutProcessed
    ) {
      void processNegotiationTimeout(id);
    }

    void db.usedListing
      .update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => {});

    const bidsPromise = isAuction
      ? db.usedAuctionBid.findMany({
          where: { listingId: id },
          orderBy: { createdAt: "desc" },
          take: 30,
          include: {
            bidder: { select: { id: true, username: true, image: true, name: true } },
          },
        })
      : Promise.resolve([]);

    let favorited = false;
    let starred = false;
    let buyerChatRoomId: string | null = null;
    let reservedTradeParticipant = false;
    let myHighestBid: number | null = null;
    let isWinningBidder = false;
    let viewerAdultVerified = false;

    const viewerPromise = viewerId
      ? Promise.all([
          db.user
            .findUnique({
              where: { id: viewerId },
              select: { birthDate: true },
            })
            .catch(() => null),
          db.usedFavorite.findUnique({
            where: { userId_listingId: { userId: viewerId, listingId: id } },
          }),
          db.usedListingStar.findUnique({
            where: { userId_listingId: { userId: viewerId, listingId: id } },
          }),
          db.usedListingChat
            .findUnique({
              where: { listingId_buyerId: { listingId: id, buyerId: viewerId } },
              select: { roomId: true },
            })
            .catch(() => null),
          isAuction
            ? db.usedAuctionBid
                .findFirst({
                  where: { listingId: id, bidderId: viewerId },
                  orderBy: { amount: "desc" },
                  select: { amount: true },
                })
                .catch(() => null)
            : Promise.resolve(null),
        ])
      : Promise.resolve(null);

    const approvedTradePromise =
      listing.status === "RESERVED" && viewerId
        ? db.usedTradeRequest
            .findFirst({
              where: { listingId: id, status: "APPROVED" },
              select: { buyerId: true, sellerId: true },
            })
            .catch(() => null)
        : Promise.resolve(null);

    const [viewerResult, auctionBids, approvedTrade] = await Promise.all([
      viewerPromise,
      bidsPromise,
      approvedTradePromise,
    ]);

    const favoriteCount = listing._count.favorites;
    const chatCount =
      (listing._count as { favorites: number; tradeChats?: number }).tradeChats ?? 0;

    const auctionLive =
      listing.saleType === "AUCTION" &&
      isAuctionLive({
        saleType: listing.saleType,
        price: listing.price,
        auctionEndsAt: listing.auctionEndsAt,
        bidIncrement: listing.bidIncrement,
        buyNowPrice: listing.buyNowPrice,
        reservePrice: listing.reservePrice,
        currentBidAmount: listing.currentBidAmount,
        currentBidderId: listing.currentBidderId,
        auctionState: listing.auctionState,
        bidCount: listing.bidCount,
        antiSnipeMinutes: listing.antiSnipeMinutes,
        status: listing.status,
      });

    let priceOffers: {
      id: string;
      amount: number;
      status: string;
      proposerId: string;
      proposer: { id: string; username: string; name: string | null };
    }[] = [];
    if (listing.auctionState === "PRICE_NEGOTIATION") {
      try {
        priceOffers = await db.usedPriceOffer.findMany({
          where: { listingId: id },
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            proposer: { select: { id: true, username: true, name: true } },
          },
        });
      } catch {
        priceOffers = [];
      }
    }

    if (viewerResult) {
      const [viewer, fav, starRow, tradeChat, myBid] = viewerResult;
      viewerAdultVerified = isUsedAdultVerified(viewer ?? { birthDate: null });
      favorited = !!fav;
      starred = !!starRow;
      buyerChatRoomId = tradeChat?.roomId ?? null;
      if (isAuction) {
        isWinningBidder =
          listing.winningBidderId === viewerId ||
          (auctionLive && listing.currentBidderId === viewerId);
        myHighestBid = myBid?.amount ?? null;
      }
      if (approvedTrade && viewerId) {
        reservedTradeParticipant =
          approvedTrade.buyerId === viewerId || approvedTrade.sellerId === viewerId;
      }
    }

    return {
      listing,
      favorited,
      starred,
      favoriteCount,
      chatCount,
      buyerChatRoomId,
      reservedTradeParticipant,
      auctionLive,
      myHighestBid,
      isWinningBidder,
      viewerAdultVerified,
      auctionBids,
      priceOffers,
    };
  } catch {
    return null;
  }
}

export async function createUsedListing(data: {
  title: string;
  description: string;
  price: number;
  currency?: string;
  category?: string;
  categories?: string[];
  region: string;
  meetPlace?: string;
  meetLat?: number;
  meetLng?: number;
  meetCountry?: string;
  images: string[];
  saleType?: "FIXED" | "AUCTION";
  auctionHours?: number;
  bidIncrement?: number;
  buyNowPrice?: number;
  reservePrice?: number;
  restrictedKind?: UsedRestrictedKind | string;
  workTitle?: string;
  productType?: string;
  isNsfw?: boolean;
  contentRating?: import("@prisma/client").ContentRating;
} & SubcultureListingInput) {
  const user = await requireAuth();
  const accessErr = assertAuctionPostAccess(user);
  if (accessErr) return { error: accessErr };

  const restricted =
    data.restrictedKind && data.restrictedKind !== "NONE"
      ? (data.restrictedKind as UsedRestrictedKind)
      : "NONE";
  if (isUsedRestrictedKind(restricted)) {
    const adultErr = assertUsedAdultForRestricted(user, restricted);
    if (adultErr) return { error: USED_ADULT_SELLER_MSG };
  }
  if (!data.title.trim()) return { error: t("actions.sojdmy3") };
  const currency = normalizeUsedCurrency(data.currency);
  const price = Math.floor(Number(data.price) || 0);
  if (data.price < 0 || price < 0) return { error: t("actions.s1y2yueo") };
  const maxPrice = maxUsedListingPrice(currency);
  if (price > maxPrice) {
    return { error: t("actions.snppf3n", { v0: maxUsedListingPriceLabel(currency) }) };
  }
  if (!data.region.trim()) return { error: t("actions.s1qzsrwg") };
  const listingCountry = normalizeMeetCountry(data.meetCountry || user.countryCode);
  if (!validateUsedRegion(data.region, listingCountry)) {
    return { error: t("actions.sj1ybzk") };
  }

  const parsedCats = parseUsedSellCategories(data.categories, data.category);
  if ("error" in parsedCats) return parsedCats;

  const isAuction = data.saleType === "AUCTION";
  if (USED_AUCTION_RETIRED && isAuction) return { error: USED_AUCTION_RETIRED_MSG };
  if (isAuction && price <= 0) return { error: t("actions.sti0vaw") };
  if (isAuction) {
    const balance = await getMocoBalanceSnapshot(user.id);
    if (!canParticipateInAuction(balance)) return { error: AUCTION_SELLER_DEPOSIT_ERROR };
  }

  const bidIncrement = Math.floor(data.bidIncrement ?? defaultBidIncrement(currency));
  const buyNowPrice =
    data.buyNowPrice != null && data.buyNowPrice > 0
      ? Math.floor(data.buyNowPrice)
      : null;
  const reservePrice =
    data.reservePrice != null && data.reservePrice > 0
      ? Math.floor(data.reservePrice)
      : null;

  if (buyNowPrice != null && buyNowPrice <= price) {
    return { error: t("actions.sd3luth") };
  }
  if (reservePrice != null && reservePrice > price && reservePrice > (buyNowPrice ?? Infinity)) {
    return { error: t("actions.s123o4yt") };
  }

  const listingRating = data.contentRating ?? (data.isNsfw ? "ADULT" : "GENERAL");
  const adultListingErr = assertAdultContentNotMonetized(listingRating, {
    hasPrice: price > 0 || (buyNowPrice ?? 0) > 0,
  });
  if (adultListingErr) return { error: adultListingErr };

  if (listingRating === "ADULT" || data.isNsfw) {
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

  const ephemeral = data.images.filter(
    (u) => typeof u === "string" && (u.startsWith("blob:") || (process.env.VERCEL && u.startsWith("/uploads/")))
  );
  if (ephemeral.length > 0) {
    return {
      error:
        t("actions.s6t0t2p"),
    };
  }

  try {
    let meetLat = data.meetLat;
    let meetLng = data.meetLng;
    const meetPlaceTrim = data.meetPlace?.trim() || null;
    const meetCountry = listingCountry;
    if (
      (meetLat == null || meetLng == null) &&
      meetPlaceTrim &&
      !isUsedShippingRegion(data.region) &&
      !data.region.includes("Shipping")
    ) {
      const geo = await geocodeMeetQuery({
        country: meetCountry,
        region: data.region,
        place: meetPlaceTrim,
      });
      if (geo) {
        meetLat = geo.lat;
        meetLng = geo.lng;
      }
    }

    const subculture = normalizeSubcultureListingInput({
      ...data,
      tradeMode: isAuction ? "SELL" : data.tradeMode,
    });
    const normalizedWork = normalizeWorkTitle(data.workTitle);
    const animeSlug =
      subculture.animeSlug ?? (await resolveAnimeSlugFromWorkTitle(normalizedWork));

    const listing = await db.$transaction(async (tx) => {
      const created = await tx.usedListing.create({
      data: {
        sellerId: user.id,
        title: data.title.trim(),
        description: data.description.trim(),
        price,
        currency,
        category: parsedCats.primary,
        workTitle: normalizedWork,
        animeSlug,
        productType:
          data.productType?.trim() && isValidProductType(data.productType.trim())
            ? data.productType.trim()
            : parsedCats.extra.includes("TCG")
              ? "TCG_CARD"
              : null,
        characterName: subculture.characterName,
        conditionGrade: subculture.conditionGrade,
        limitedKind: subculture.limitedKind,
        listingFormat: subculture.listingFormat,
        tradeMode: subculture.tradeMode,
        itemOrigin: subculture.itemOrigin,
        packagingState: subculture.packagingState,
        subcultureMeta: mergeExtraCategories(
          (subculture.subcultureMeta as Prisma.JsonValue | undefined) ?? undefined,
          parsedCats.extra
        ),
        restrictedKind: restricted,
        region: data.region.trim(),
        meetPlace: meetPlaceTrim,
        meetLat: meetLat ?? null,
        meetLng: meetLng ?? null,
        meetCountry,
        images: data.images as Prisma.InputJsonValue,
        contentRating: data.contentRating ?? (data.isNsfw ? "ADULT" : "GENERAL"),
        isNsfw: (data.contentRating ?? (data.isNsfw ? "ADULT" : "GENERAL")) === "ADULT",
        saleType: isAuction ? "AUCTION" : "FIXED",
        ...(isAuction
          ? {
              auctionEndsAt: standardAuctionEndsAt(),
              bidIncrement,
              buyNowPrice,
              reservePrice,
              auctionState: "LIVE" as const,
              antiSnipeMinutes: 5,
            }
          : {}),
      },
      });
      if (isAuction) {
        await lockSellerDepositInTransaction(tx, { userId: user.id, listingId: created.id });
      }
      return created;
    });
    void notifyWtbAlertsForListing(listing.id).catch(() => undefined);
    revalidatePath("/market");
    revalidatePath("/market/my");
    return { listingId: listing.id };
  } catch (e) {
    if (mapDepositError(e)) return { error: AUCTION_SELLER_DEPOSIT_ERROR };
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2021") {
        return { error: t("actions.db_supabase_sql_k") };
      }
      if (e.code === "P2022") {
        return {
          error:
            t("actions.db_meetcountry_supabase_alter_table"),
        };
      }
    }
    console.error("[createUsedListing]", e);
    const detail = e instanceof Error ? e.message : "";
    if (/meetCountry/i.test(detail) || /column .* does not exist/i.test(detail)) {
      return {
        error:
          t("actions.db_meetcountry_supabase_sql_meetcountry"),
      };
    }
    return {
      error:
        t("actions.s178nboa"),
    };
  }
}

export async function updateUsedListingStatus(listingId: string, status: UsedListingStatus) {
  const user = await requireAuth();
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== user.id) return { error: t("actions.st3onev") };
  const accessErr = assertAuctionPostAccess(user);
  if (accessErr) return { error: accessErr };

  if (listing.saleType === "AUCTION" && status === "SOLD") {
    const confirmed = await confirmAuctionTradeComplete(user.id, listingId);
    if ("error" in confirmed) return confirmed;
    revalidatePath(`/market/${listingId}`);
    revalidatePath("/market/my");
    revalidatePath("/market");
    return confirmed;
  }

  await db.usedListing.update({ where: { id: listingId }, data: { status } });
  if (status === "SOLD") {
    void finalizeUsedListingSold(listingId).catch(() => undefined);
  }
  revalidatePath(`/market/${listingId}`);
  revalidatePath("/market/my");
  revalidatePath("/market");
  return { success: true };
}

export async function deleteUsedListing(listingId: string) {
  const user = await requireAuth();
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== user.id) return { error: t("actions.st3onev") };
  const accessErr = assertAuctionPostAccess(user);
  if (accessErr) return { error: accessErr };

  if (listing.saleType === "AUCTION") {
    await releaseAllListingDepositsExcept(listingId, null, "listing_deleted");
  }
  await db.usedListing.delete({ where: { id: listingId } });
  revalidatePath("/market");
  revalidatePath("/market/my");
  return { success: true };
}

export async function toggleUsedListingStar(listingId: string) {
  const user = await requireAuth();
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: { id: true, sellerId: true, meetCountry: true, region: true },
  });
  if (!listing) return { error: t("actions.s1cdkrl9") };
  const visibleErr = await assertUsedMarketListingVisible({
    userId: user.id,
    listing,
  });
  if (visibleErr) return { error: visibleErr };

  const existing = await db.usedListingStar.findUnique({
    where: { userId_listingId: { userId: user.id, listingId } },
  });
  if (existing) {
    await db.usedListingStar.delete({ where: { id: existing.id } });
    revalidatePath("/market");
    revalidatePath(`/market/${listingId}`);
    revalidatePath("/star");
    return { starred: false as const };
  }
  await db.usedListingStar.create({ data: { userId: user.id, listingId } });
  revalidatePath("/market");
  revalidatePath(`/market/${listingId}`);
  revalidatePath("/star");
  return { starred: true as const };
}

export async function toggleUsedFavorite(listingId: string) {
  const user = await requireAuth();
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: { sellerId: true, title: true, meetCountry: true, region: true },
  });
  if (!listing) return { error: t("actions.s1cdkrl9") };
  const tradeErr = await assertUsedMarketTradeAccess({
    userId: user.id,
    buyerCountry: user.countryCode,
    listing,
  });
  if (tradeErr) return { error: tradeErr };

  const existing = await db.usedFavorite.findUnique({
    where: { userId_listingId: { userId: user.id, listingId } },
  });
  if (existing) {
    await db.usedFavorite.delete({ where: { id: existing.id } });
    revalidatePath(`/market/${listingId}`);
    return { favorited: false };
  }
  await db.usedFavorite.create({ data: { userId: user.id, listingId } });
  const { notifyListingLiked } = await import("@/lib/notifications");
  void notifyListingLiked({
    listingId,
    sellerId: listing.sellerId,
    actorId: user.id,
    title: listing.title,
  });
  revalidatePath(`/market/${listingId}`);
  return { favorited: true };
}

export async function getMyUsedDashboard(userId: string) {
  try {
    const [selling, reserved, sold, favorites] = await Promise.all([
      db.usedListing.findMany({
        where: { sellerId: userId, status: "SELLING" },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.usedListing.findMany({
        where: { sellerId: userId, status: "RESERVED" },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      db.usedListing.findMany({
        where: { sellerId: userId, status: "SOLD" },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      db.usedFavorite.findMany({
        where: { userId },
        include: { listing: { include: { seller: { select: { username: true } } } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);
    return { selling, reserved, sold, favorites };
  } catch {
    return { selling: [], reserved: [], sold: [], favorites: [] };
  }
}

export type UsedHubLane = "purchased" | "selling" | "live-auctions" | "favorites" | "disputes";

export async function getMyUsedHubLane(lane: UsedHubLane) {
  const user = await requireAuth();
  const {
    listMobileMyUsedListings,
    listMobileUsedDisputes,
    listMobileUsedFavorites,
    listMobileUsedPurchases,
    listMobileLiveAuctions,
  } = await import("@/lib/used-market-mobile");
  try {
    if (lane === "purchased") return { items: await listMobileUsedPurchases(user.id) };
    if (lane === "selling") return { items: await listMobileMyUsedListings(user.id) };
    if (lane === "live-auctions") return { items: USED_AUCTION_RETIRED ? [] : await listMobileLiveAuctions(user.id) };
    if (lane === "favorites") return { items: await listMobileUsedFavorites(user.id) };
    return { items: await listMobileUsedDisputes(user.id) };
  } catch (e) {
    console.error("[used-market] getMyUsedHubLane", e);
    return { items: [] };
  }
}

/** 판매자와 1:1 DM으로 거래 문의 */
export async function startUsedTradeChat(listingId: string) {
  const user = await requireAuth();
  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    include: { seller: { select: { id: true, username: true } } },
  });
  if (!listing) return { error: t("actions.s1cdkrl9") };
  if (listing.sellerId === user.id) return { error: t("actions.sscry5a") };
  const tradeErr = await assertUsedMarketTradeAccess({
    userId: user.id,
    buyerCountry: user.countryCode,
    listing,
  });
  if (tradeErr) return { error: tradeErr };
  if (listing.status === "SOLD") return { error: t("actions.s1mmunw") };
  if (
    listing.saleType === "AUCTION" &&
    listing.auctionEndsAt &&
    listing.auctionEndsAt.getTime() > Date.now() &&
    listing.auctionState !== "ENDED"
  ) {
    return { error: t("actions.socghxo") };
  }

  const dm = await getOrCreateDM(listing.sellerId);
  if ("error" in dm && dm.error) return { error: dm.error };
  if (!("room" in dm) || !dm.room) return { error: t("actions.s1k5cvor") };

  try {
    await db.usedListingChat.upsert({
      where: { listingId_buyerId: { listingId, buyerId: user.id } },
      create: { listingId, roomId: dm.room.id, buyerId: user.id },
      update: { roomId: dm.room.id },
    });
  } catch {
    /* DB 미적용 환경에서도 채팅은 진행 */
  }

  const priceText = formatUsedPrice(listing.price, listing.currency);
  const intro = t("actions.n_n_n_n_market", { v0: listing.title, v1: priceText, v2: listing.id });
  try {
    await sendMessage({ roomId: dm.room.id, content: intro });
  } catch {
    /* 메시지 실패해도 방으로 이동 */
  }

  revalidatePath(`/market/${listingId}`);
  return { roomId: dm.room.id };
}

/** 판매자 — 이 글에 연결된 채팅방 목록 */
export async function getUsedListingChatRooms(listingId: string) {
  const user = await requireAuth();
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: { sellerId: true },
  });
  if (!listing || listing.sellerId !== user.id) return { error: t("actions.st3onev") };

  try {
    const rows = await db.usedListingChat.findMany({
      where: { listingId },
      orderBy: { createdAt: "desc" },
      include: {
        buyer: { select: { id: true, username: true, image: true, name: true } },
      },
    });
    return { rooms: rows.map((r) => ({ roomId: r.roomId, buyer: r.buyer })) };
  } catch {
    return { rooms: [] as { roomId: string; buyer: { id: string; username: string; image: string | null; name: string | null } }[] };
  }
}
