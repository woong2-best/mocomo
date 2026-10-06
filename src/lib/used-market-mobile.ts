import { Prisma, type UsedRestrictedKind } from "@prisma/client";
import { db } from "@/lib/db";
import { assertAuctionPostAccess, assertUsedMarketAccess } from "@/lib/used-market-access";
import { assertUsedMarketTradeAccess } from "@/lib/used-market-locale-scope";
import {
  assertUsedAdultForRestricted,
  isUsedRestrictedKind,
  USED_ADULT_SELLER_MSG,
} from "@/lib/used-youth-protection";
import {
  defaultBidIncrement,
  standardAuctionEndsAt,
} from "@/lib/used-auction";
import {
  formatUsedPrice,
  maxUsedListingPrice,
  maxUsedListingPriceLabel,
  normalizeUsedCurrency,
  listingImages,
} from "@/lib/used-market";
import { isUsedShippingRegion, isValidUsedRegion } from "@/lib/used-regions-global";
import {
  isValidProductType,
  normalizeWorkTitle,
} from "@/lib/used-catalog";
import { normalizeSubcultureListingInput } from "@/lib/subculture-commerce/normalize";
import type { SubcultureListingInput } from "@/lib/subculture-commerce/types";
import { resolveAnimeSlugFromWorkTitle } from "@/lib/subculture-commerce/anime-suggest";
import { notifyWtbAlertsForListing } from "@/lib/subculture-commerce/wtb-alerts";
import { geocodeMeetQuery } from "@/lib/maps/geocode";
import { normalizeMeetCountry } from "@/lib/maps/select-engine";
import { finalizeExpiredAuctionIfNeeded } from "@/actions/used-auction";
import { notifyAuctionWatchers, sendUsedAuctionNotification } from "@/lib/used-auction-notify";
import { executeUsedAuctionBid } from "@/lib/used-auction-bid-core";
import { sendMobileDmMessage } from "@/lib/chat-dm-service";
import { openMarketListingChat } from "@/lib/market-trade-chat";
import { getDirectTradeView } from "@/lib/direct-trade/service";
import {
  AUCTION_SELLER_DEPOSIT_ERROR,
  canParticipateInAuction,
  getMocoBalanceSnapshot,
  lockSellerDepositInTransaction,
  mapDepositError,
} from "@/lib/auction-deposit";
import {
  listingCategoryTags,
  mergeExtraCategories,
  parseUsedSellCategories,
} from "@/lib/used-listing-categories";
import { USED_AUCTION_RETIRED, USED_AUCTION_RETIRED_MSG } from "@/lib/retired-product-features";

const usedMarketUserSelect = {
  id: true,
  countryCode: true,
  usedServiceRegion: true,
  stripeOnboardingCompleted: true,
  stripeConnectOnboardedAt: true,
  phoneVerified: true,
  usedMarketBannedAt: true,
  birthDate: true,
} as const;

async function loadUsedMarketUser(userId: string) {
  return db.user.findUnique({
    where: { id: userId },
    select: usedMarketUserSelect,
  });
}

export async function createMobileUsedListing(
  userId: string,
  data: {
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
  } & SubcultureListingInput
) {
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "Sign-in required." as const };

  const isAuction = data.saleType === "AUCTION";
  if (USED_AUCTION_RETIRED && isAuction) return { error: USED_AUCTION_RETIRED_MSG };
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
  if (!data.title.trim()) return { error: "Enter a title." as const };
  const currency = normalizeUsedCurrency(data.currency);
  const price = Math.floor(Number(data.price) || 0);
  if (data.price < 0 || price < 0) return { error: "Invalid price." as const };
  const maxPrice = maxUsedListingPrice(currency);
  if (price > maxPrice) {
    return { error: `가격은 ${maxUsedListingPriceLabel(currency)} 이하로 입력해 주세요.` as const };
  }
  if (!data.region.trim()) return { error: "Select a trading area." as const };
  const listingCountry = normalizeMeetCountry(data.meetCountry || user.countryCode);
  if (!isValidUsedRegion(data.region, listingCountry)) {
    return { error: "Select a valid trading area." as const };
  }

  const parsedCats = parseUsedSellCategories(data.categories, data.category);
  if ("error" in parsedCats && parsedCats.error) return { error: parsedCats.error };

  if (isAuction && price <= 0) return { error: "Enter a starting bid." as const };
  if (isAuction) {
    const balance = await getMocoBalanceSnapshot(userId);
    if (!canParticipateInAuction(balance)) return { error: AUCTION_SELLER_DEPOSIT_ERROR };
  }

  const bidIncrement = Math.floor(data.bidIncrement ?? defaultBidIncrement(currency));
  const buyNowPrice =
    data.buyNowPrice != null && data.buyNowPrice > 0 ? Math.floor(data.buyNowPrice) : null;
  const reservePrice =
    data.reservePrice != null && data.reservePrice > 0 ? Math.floor(data.reservePrice) : null;

  if (buyNowPrice != null && buyNowPrice <= price) {
    return { error: "Buy-now price must be higher than the starting bid." as const };
  }

  const ephemeral = data.images.filter(
    (u) =>
      typeof u === "string" &&
      (u.startsWith("blob:") || (process.env.VERCEL && u.startsWith("/uploads/")))
  );
  if (ephemeral.length > 0) {
    return {
      error: "Photos weren't saved permanently. Please add them again." as const,
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
        sellerId: userId,
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
        isNsfw: !!data.isNsfw,
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
        await lockSellerDepositInTransaction(tx, { userId, listingId: created.id });
      }
      return created;
    });
    void notifyWtbAlertsForListing(listing.id).catch(() => undefined);
    return { listingId: listing.id };
  } catch (e) {
    if (mapDepositError(e)) return { error: AUCTION_SELLER_DEPOSIT_ERROR };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return { error: "Marketplace database isn't ready." as const };
    }
    console.error("[createMobileUsedListing]", e);
    return { error: "Couldn't post the listing. Please try again shortly." as const };
  }
}

export async function listMobileMyUsedListings(
  userId: string,
  saleType?: "FIXED" | "AUCTION"
) {
  const listings = await db.usedListing.findMany({
    where: { sellerId: userId, ...(saleType ? { saleType } : {}) },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      price: true,
      currency: true,
      region: true,
      status: true,
      saleType: true,
      images: true,
      updatedAt: true,
      auctionEndsAt: true,
      currentBidAmount: true,
      bidCount: true,
    },
  });

  return listings.map((l) => {
    const images = listingImages(l.images);
    return {
      id: l.id,
      title: l.title,
      price: l.price,
      currency: l.currency,
      thumbnailUrl: images[0] ?? null,
      region: l.region,
      status: l.status,
      saleType: l.saleType,
      updatedAt: l.updatedAt.toISOString(),
      auctionEndsAt: l.auctionEndsAt?.toISOString() ?? null,
      currentBidAmount: l.currentBidAmount ?? null,
      bidCount: l.bidCount ?? null,
    };
  });
}

export async function toggleMobileUsedListingStar(userId: string, listingId: string) {
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "Sign-in required." as const };

  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: { id: true, sellerId: true, meetCountry: true, region: true },
  });
  if (!listing) return { error: "Listing not found." as const };
  const { assertUsedMarketListingVisible } = await import("@/lib/used-market-locale-scope");
  const visibleErr = await assertUsedMarketListingVisible({ userId, listing });
  if (visibleErr) return { error: visibleErr };

  const existing = await db.usedListingStar.findUnique({
    where: { userId_listingId: { userId, listingId } },
  });
  if (existing) {
    await db.usedListingStar.delete({ where: { id: existing.id } });
    return { starred: false as const };
  }
  await db.usedListingStar.create({ data: { userId, listingId } });
  return { starred: true as const };
}

export async function toggleMobileUsedFavorite(userId: string, listingId: string) {
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "Sign-in required." as const };

  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: { sellerId: true, title: true, meetCountry: true, region: true },
  });
  if (!listing) return { error: "Listing not found." as const };
  const tradeErr = await assertUsedMarketTradeAccess({
    userId,
    buyerCountry: user.countryCode,
    listing,
  });
  if (tradeErr) return { error: tradeErr };

  const existing = await db.usedFavorite.findUnique({
    where: { userId_listingId: { userId, listingId } },
  });
  if (existing) {
    await db.usedFavorite.delete({ where: { id: existing.id } });
    return { favorited: false as const };
  }
  await db.usedFavorite.create({ data: { userId, listingId } });
  const { notifyListingLiked } = await import("@/lib/notifications");
  void notifyListingLiked({
    listingId,
    sellerId: listing.sellerId,
    actorId: userId,
    title: listing.title,
  });
  return { favorited: true as const };
}

export async function startMobileUsedTradeChat(userId: string, listingId: string) {
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "Sign-in required." as const };

  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    include: { seller: { select: { id: true, username: true } } },
  });
  if (!listing) return { error: "Listing not found." as const };
  if (listing.sellerId !== userId) {
    const tradeErr = await assertUsedMarketTradeAccess({
      userId,
      buyerCountry: user.countryCode,
      listing,
    });
    if (tradeErr) return { error: tradeErr };
  }

  const adultErr = assertUsedAdultForRestricted(user, listing.restrictedKind ?? "NONE");
  if (adultErr) return { error: adultErr, needsAdultVerify: true as const };

  return openMarketListingChat(userId, listingId);
}

export async function placeMobileUsedAuctionBid(
  userId: string,
  listingId: string,
  amount: number,
  termsAccepted?: boolean,
  opts?: { paymentIntentDbId?: string | null }
) {
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "Sign-in required." as const };

  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  if (!termsAccepted) {
    return { error: "Agree to payment obligations and usage limits before bidding." as const };
  }

  const bidAmount = Math.floor(amount);
  if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
    return { error: "Enter a valid bid amount." as const };
  }

  try {
    await finalizeExpiredAuctionIfNeeded(listingId);

    const listing = await db.usedListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.saleType !== "AUCTION") {
      return { error: "This isn't an auction item." as const };
    }
    const tradeErr = await assertUsedMarketTradeAccess({
      userId,
      buyerCountry: user.countryCode,
      listing,
    });
    if (tradeErr) return { error: tradeErr };
    const adultErr = assertUsedAdultForRestricted(user, listing.restrictedKind ?? "NONE");
    if (adultErr) return { error: adultErr, needsAdultVerify: true as const };

    const result = await executeUsedAuctionBid({
      userId,
      listingId,
      bidAmount,
      termsAccepted: true,
      paymentIntentDbId: opts?.paymentIntentDbId,
    });

    if ("error" in result) {
      return result;
    }

    const link = `/market/${listingId}`;
    const priceLabel = formatUsedPrice(result.amount, listing.currency);
    await sendUsedAuctionNotification({
      userId: listing.sellerId,
      type: "bid",
      title: "New bid",
      body: `${listing.title} · ${priceLabel}`,
      link,
      actorId: userId,
    });

    const prevBidderId = listing.currentBidderId;
    if (prevBidderId && prevBidderId !== userId) {
      await sendUsedAuctionNotification({
        userId: prevBidderId,
        type: "outbid",
        title: "Higher bid",
        body: `${listing.title} — ${priceLabel}로 더 높은 입찰이 들어왔습니다.`,
        link,
        actorId: userId,
      });
    }

    if (result.extended) {
      await notifyAuctionWatchers({
        listingId,
        sellerId: listing.sellerId,
        type: "extended",
        title: "Auction extended",
        body: `${listing.title} — 마감 직전 입찰로 종료 시각이 연장되었습니다.`,
      });
    }

    return { success: true as const, amount: result.amount, extended: result.extended };
  } catch (e) {
    console.error("[placeMobileUsedAuctionBid]", e);
    return { error: "Bid failed. Please try again shortly." as const };
  }
}

const hubListingSelect = {
  id: true,
  title: true,
  price: true,
  currency: true,
  region: true,
  status: true,
  saleType: true,
  images: true,
  createdAt: true,
  category: true,
  productType: true,
  workTitle: true,
  characterName: true,
  conditionGrade: true,
  limitedKind: true,
  tradeMode: true,
  subcultureMeta: true,
  isNsfw: true,
  viewCount: true,
  sellerId: true,
  auctionEndsAt: true,
  currentBidAmount: true,
  bidCount: true,
  seller: { select: { id: true, username: true, image: true } },
  _count: { select: { favorites: true } },
} as const;

function mapHubListing(
  l: Prisma.UsedListingGetPayload<{ select: typeof hubListingSelect }>,
  opts?: { favorited?: boolean }
) {
  const images = listingImages(l.images);
  return {
    id: l.id,
    title: l.title,
    price: l.price,
    currency: l.currency,
    thumbnailUrl: images[0] ?? null,
    region: l.region,
    status: l.status,
    saleType: l.saleType,
    createdAt: l.createdAt.toISOString(),
    favoriteCount: l._count?.favorites ?? 0,
    viewCount: l.viewCount ?? 0,
    favorited: opts?.favorited ?? false,
    auctionEndsAt: l.auctionEndsAt?.toISOString() ?? null,
    currentBidAmount: l.currentBidAmount ?? null,
    bidCount: l.bidCount ?? null,
    workTitle: l.workTitle ?? null,
    productType: l.productType ?? null,
    characterName: l.characterName ?? null,
    conditionGrade: l.conditionGrade ?? null,
    limitedKind: l.limitedKind ?? null,
    tradeMode: l.tradeMode ?? null,
    subcultureMeta: l.subcultureMeta ?? null,
    isNsfw: l.isNsfw,
    sellerId: l.sellerId,
    seller: l.seller
      ? { id: l.seller.id, username: l.seller.username, image: l.seller.image }
      : null,
    categories: listingCategoryTags(l),
  };
}

export async function listMobileUsedByIds(ids: string[]) {
  const unique = [...new Set(ids.filter((id) => id && id.length < 64))].slice(0, 24);
  if (unique.length === 0) return [];
  const listings = await db.usedListing.findMany({
    where: { id: { in: unique } },
    select: hubListingSelect,
  });
  const byId = new Map(listings.map((l) => [l.id, l]));
  return unique.map((id) => byId.get(id)).filter(Boolean).map((l) => mapHubListing(l!));
}

export async function listMobileUsedFavorites(userId: string, take = 48) {
  const rows = await db.usedFavorite.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: Math.min(take, 48),
    select: { listing: { select: hubListingSelect } },
  });
  return rows.map((row) => mapHubListing(row.listing, { favorited: true }));
}

export async function listMobileUsedPurchases(userId: string, take = 48) {
  const listings = await db.usedListing.findMany({
    where: {
      OR: [
        { winningBidderId: userId, status: { in: ["SOLD", "RESERVED"] } },
        { marketplaceOrder: { buyerId: userId } },
        { tradeChats: { some: { buyerId: userId } }, status: "SOLD" },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: Math.min(take, 48),
    select: hubListingSelect,
  });
  return listings.map((l) => mapHubListing(l));
}

export async function listMobileLiveAuctions(userId: string, take = 48) {
  const mine = await db.usedListing.findMany({
    where: {
      saleType: "AUCTION",
      status: "SELLING",
      OR: [
        { auctionBids: { some: { bidderId: userId } } },
        { sellerId: userId, auctionState: "LIVE" },
        { currentBidderId: userId },
        { winningBidderId: userId, status: "SELLING" },
      ],
    },
    orderBy: { auctionEndsAt: "asc" },
    take: Math.min(take, 48),
    select: hubListingSelect,
  });
  if (mine.length > 0) return mine.map((l) => mapHubListing(l));
  const open = await db.usedListing.findMany({
    where: { saleType: "AUCTION", status: "SELLING" },
    orderBy: { createdAt: "desc" },
    take: Math.min(take, 48),
    select: hubListingSelect,
  });
  return open.map((l) => mapHubListing(l));
}

export async function listMobileUsedDisputes(userId: string, take = 48) {
  const [appeals, disputes] = await Promise.all([
    db.usedMarketAppeal.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: Math.min(take, 24),
      select: {
        id: true,
        title: true,
        createdAt: true,
        listing: { select: hubListingSelect },
      },
    }),
    db.marketplaceDispute.findMany({
      where: {
        OR: [{ openerId: userId }, { order: { buyerId: userId } }, { order: { sellerId: userId } }],
        order: { usedListingId: { not: null } },
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(take, 24),
      select: {
        id: true,
        createdAt: true,
        order: { select: { usedListing: { select: hubListingSelect } } },
      },
    }),
  ]);
  const items = [
    ...appeals.map((row) =>
      row.listing
        ? mapHubListing(row.listing)
        : {
            id: row.id,
            title: row.title,
            price: 0,
            currency: "krw",
            thumbnailUrl: null,
            region: null,
            status: "DISPUTE",
            saleType: "FIXED",
            createdAt: row.createdAt.toISOString(),
            favoriteCount: 0,
            viewCount: 0,
            auctionEndsAt: null,
            currentBidAmount: null,
            bidCount: null,
            workTitle: null,
            productType: null,
            characterName: null,
            conditionGrade: null,
            limitedKind: null,
            tradeMode: null,
            subcultureMeta: null,
            isNsfw: false,
            sellerId: undefined,
            seller: null,
            categories: [],
          }
    ),
    ...disputes
      .map((row) => row.order.usedListing)
      .filter(Boolean)
      .map((listing) => mapHubListing(listing!)),
  ];
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export async function listMobileRecommendedUsed(userId: string | null, take = 24) {
  const limit = Math.min(take, 48);
  const purchased = userId
    ? await db.usedListing.findMany({
        where: {
          OR: [
            { winningBidderId: userId, status: { in: ["SOLD", "RESERVED"] } },
            { marketplaceOrder: { buyerId: userId } },
            { tradeChats: { some: { buyerId: userId } }, status: "SOLD" },
          ],
        },
        take: 40,
        select: {
          id: true,
          category: true,
          productType: true,
          subcultureMeta: true,
        },
      })
    : [];
  const preferred = new Set<string>();
  for (const row of purchased) {
    for (const tag of listingCategoryTags(row)) preferred.add(tag);
  }
  const exclude = purchased.map((row) => row.id);
  const pool = await db.usedListing.findMany({
    where: {
      status: "SELLING",
      ...(exclude.length ? { id: { notIn: exclude } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    select: hubListingSelect,
  });
  const scored = pool
    .map((listing) => {
      const tags = listingCategoryTags(listing);
      const overlap = tags.filter((tag) => preferred.has(tag)).length;
      return { listing, overlap };
    })
    .sort((a, b) => b.overlap - a.overlap || +b.listing.createdAt - +a.listing.createdAt);
  const items = scored.slice(0, limit).map((row) => mapHubListing(row.listing));
  if (!userId || items.length === 0) return items;
  const favRows = await db.usedFavorite.findMany({
    where: { userId, listingId: { in: items.map((item) => item.id) } },
    select: { listingId: true },
  });
  const favIds = new Set(favRows.map((row) => row.listingId));
  return items.map((item) => ({ ...item, favorited: favIds.has(item.id) }));
}

function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function isUsedListingEditable(status: string) {
  return status === "SELLING";
}

export async function deleteMobileUsedListing(userId: string, listingId: string) {
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== userId) return { error: "Permission denied." as const };
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "Sign-in required." as const };
  const accessErr = assertAuctionPostAccess(user);
  if (accessErr) return { error: accessErr };

  if (listing.saleType === "AUCTION") {
    const { releaseAllListingDepositsExcept } = await import("@/lib/auction-deposit");
    await releaseAllListingDepositsExcept(listingId, null, "listing_deleted");
  }
  await db.usedListing.delete({ where: { id: listingId } });
  return { success: true as const };
}

export async function bumpMobileUsedListing(userId: string, listingId: string) {
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== userId) return { error: "Permission denied." as const };
  if (listing.saleType !== "FIXED") return { error: "Auction listings can't be bumped." as const };
  if (!isUsedListingEditable(listing.status)) {
    return { error: "Can't bump listings that are in progress or completed." as const };
  }
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "Sign-in required." as const };
  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  const dayStart = startOfUtcDay();
  if (listing.lastBumpedAt && listing.lastBumpedAt >= dayStart) {
    return { error: "You can bump once per day." as const };
  }
  const now = new Date();
  await db.usedListing.update({
    where: { id: listingId },
    data: { lastBumpedAt: now, createdAt: now },
  });
  return { success: true as const, bumpedAt: now.toISOString() };
}

export async function updateMobileUsedListing(
  userId: string,
  listingId: string,
  data: {
    title?: string;
    description?: string;
    price?: number;
    currency?: string;
    region?: string;
    meetPlace?: string;
    meetLat?: number;
    meetLng?: number;
    meetCountry?: string;
    images?: string[];
    isNsfw?: boolean;
  } & SubcultureListingInput
) {
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== userId) return { error: "Permission denied." as const };
  if (!isUsedListingEditable(listing.status)) {
    return { error: "Can't edit while a trade is in progress." as const };
  }
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "Sign-in required." as const };
  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  const title = (data.title ?? listing.title).trim();
  if (!title) return { error: "Enter a title." as const };
  const currency = normalizeUsedCurrency(data.currency ?? listing.currency);
  const price =
    data.price !== undefined ? Math.floor(Number(data.price) || 0) : listing.price;
  if (price < 0) return { error: "Invalid price." as const };
  const maxPrice = maxUsedListingPrice(currency);
  if (price > maxPrice) {
    return { error: `가격은 ${maxUsedListingPriceLabel(currency)} 이하로 입력해 주세요.` as const };
  }
  const region = (data.region ?? listing.region).trim();
  if (!region) return { error: "Select a trading area." as const };

  const subculture = normalizeSubcultureListingInput({
    characterName: data.characterName,
    conditionGrade: data.conditionGrade,
    limitedKind: data.limitedKind,
    listingFormat: data.listingFormat,
    tradeMode: data.tradeMode,
    itemOrigin: data.itemOrigin,
    packagingState: data.packagingState,
    subcultureMeta: data.subcultureMeta,
    workTitle: data.workTitle,
    animeSlug: data.animeSlug,
    productType: data.productType,
  });
  const normalizedWork =
    data.workTitle !== undefined ? normalizeWorkTitle(data.workTitle) : listing.workTitle;
  const animeSlug =
    subculture.animeSlug ??
    (data.workTitle !== undefined
      ? await resolveAnimeSlugFromWorkTitle(normalizedWork)
      : listing.animeSlug);
  const productType =
    data.productType?.trim() && isValidProductType(data.productType.trim())
      ? data.productType.trim()
      : listing.productType;

  const { animeSlug: _inputAnimeSlug, subcultureMeta, ...subcultureRow } = subculture;

  await db.usedListing.update({
    where: { id: listingId },
    data: {
      title,
      description: data.description !== undefined ? data.description : listing.description,
      price,
      currency,
      region,
      meetPlace: data.meetPlace !== undefined ? data.meetPlace : listing.meetPlace,
      meetLat: data.meetLat !== undefined ? data.meetLat : listing.meetLat,
      meetLng: data.meetLng !== undefined ? data.meetLng : listing.meetLng,
      meetCountry:
        data.meetCountry !== undefined
          ? normalizeMeetCountry(data.meetCountry)
          : listing.meetCountry,
      ...(data.images !== undefined ? { images: data.images as Prisma.InputJsonValue } : {}),
      isNsfw: data.isNsfw !== undefined ? data.isNsfw : listing.isNsfw,
      workTitle: normalizedWork,
      productType,
      ...subcultureRow,
      subcultureMeta:
        subcultureMeta === null
          ? Prisma.DbNull
          : (subcultureMeta as Prisma.InputJsonValue),
      animeSlug,
    },
  });
  return { success: true as const, listingId };
}

export async function getMobileUsedTradeRoomContext(userId: string, roomId: string) {
  const link = await db.usedListingChat.findFirst({
    where: { roomId },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          status: true,
          sellerId: true,
          saleType: true,
          price: true,
          currency: true,
          currentBidAmount: true,
          seller: { select: { username: true } },
        },
      },
    },
  });
  if (!link?.listing) return null;
  const listing = link.listing;
  const isBuyer = link.buyerId === userId;
  const isSeller = listing.sellerId === userId;
  if (!isBuyer && !isSeller) return null;

  let pendingRequestId: string | null = null;
  let approvedMeet: {
    requestId: string;
    meetAt: string;
    buyerMeetConfirmedAt: string | null;
    sellerMeetConfirmedAt: string | null;
    meetCompletionDeclinedAt: string | null;
    showCompletionPrompt: boolean;
  } | null = null;
  try {
    const pending = await db.usedTradeRequest.findFirst({
      where: {
        roomId,
        listingId: listing.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    pendingRequestId = pending?.id ?? null;

    const approved = await db.usedTradeRequest.findFirst({
      where: {
        roomId,
        listingId: listing.id,
        status: "APPROVED",
      },
      orderBy: { respondedAt: "desc" },
      select: {
        id: true,
        meetAt: true,
        buyerMeetConfirmedAt: true,
        sellerMeetConfirmedAt: true,
        meetCompletionDeclinedAt: true,
      },
    });
    if (approved?.meetAt) {
      const { isUsedTradeMeetCompletionDue } = await import("@/lib/used-trade-meet");
      approvedMeet = {
        requestId: approved.id,
        meetAt: approved.meetAt.toISOString(),
        buyerMeetConfirmedAt: approved.buyerMeetConfirmedAt?.toISOString() ?? null,
        sellerMeetConfirmedAt: approved.sellerMeetConfirmedAt?.toISOString() ?? null,
        meetCompletionDeclinedAt: approved.meetCompletionDeclinedAt?.toISOString() ?? null,
        showCompletionPrompt:
          listing.status === "RESERVED" &&
          !approved.meetCompletionDeclinedAt &&
          isUsedTradeMeetCompletionDue(approved.meetAt) &&
          !(approved.buyerMeetConfirmedAt && approved.sellerMeetConfirmedAt),
      };
    }
  } catch {
    pendingRequestId = null;
    approvedMeet = null;
  }

  let directTrade = null;
  try {
    directTrade = await getDirectTradeView(userId, { roomId });
  } catch {
    directTrade = null;
  }

  return {
    listingId: listing.id,
    listingTitle: listing.title,
    listingStatus: listing.status,
    saleType: listing.saleType,
    priceLabel: formatUsedPrice(listing.currentBidAmount ?? listing.price, listing.currency),
    sellerUsername: listing.seller.username,
    sellerId: listing.sellerId,
    buyerId: link.buyerId,
    isBuyer,
    isSeller,
    canRequestTrade:
      (isBuyer || isSeller) &&
      listing.status === "SELLING" &&
      listing.saleType === "FIXED" &&
      !pendingRequestId,
    editLocked: !isUsedListingEditable(listing.status),
    pendingRequestId,
    approvedMeet,
    directTrade,
  };
}

export async function createMobileUsedTradeRequest(
  userId: string,
  listingId: string,
  roomId: string,
  meetAtIso: string
) {
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "Sign-in required." as const };
  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  const { assertMoneyAgeAllowed } = await import("@/lib/money-age-gate");
  const ageBlock = await assertMoneyAgeAllowed(userId);
  if (ageBlock) return { error: ageBlock.error };

  const meetAt = new Date(meetAtIso);
  if (Number.isNaN(meetAt.getTime()) || meetAt.getTime() < Date.now() - 60_000) {
    return { error: "Choose a meetup date and time." as const };
  }

  const link = await db.usedListingChat.findFirst({
    where: { listingId, roomId },
    include: {
      listing: {
        select: { id: true, sellerId: true, status: true, saleType: true, title: true },
      },
    },
  });
  if (!link?.listing) return { error: "Trade requests aren't available in this chat." as const };
  const listing = link.listing;
  const isBuyer = link.buyerId === userId;
  const isSeller = listing.sellerId === userId;
  if (!isBuyer && !isSeller) return { error: "Trade requests aren't available in this chat." as const };
  if (listing.saleType !== "FIXED") return { error: "Trade requests aren't available for auction items." as const };
  if (listing.status !== "SELLING") {
    return { error: "This item is already in a trade or sold." as const };
  }

  const existingPending = await db.usedTradeRequest.findFirst({
    where: { listingId, roomId, status: "PENDING" },
  });
  if (existingPending) {
    return { error: "You already sent a trade request." as const, requestId: existingPending.id };
  }

  const request = await db.usedTradeRequest.create({
    data: {
      listingId,
      buyerId: link.buyerId,
      sellerId: listing.sellerId,
      requestedById: userId,
      roomId,
      status: "PENDING",
      meetAt,
    },
  });

  const { buildUsedTradeRequestMessageBody } = await import("@/lib/chat-used-trade-request-marker");
  await sendMobileDmMessage(userId, {
    roomId,
    content: buildUsedTradeRequestMessageBody(request.id),
  }).catch(() => undefined);

  return { requestId: request.id, status: request.status };
}

export async function getMobileUsedTradeRequest(userId: string, requestId: string) {
  const row = await db.usedTradeRequest.findUnique({
    where: { id: requestId },
    include: {
      listing: { select: { id: true, title: true, status: true } },
      buyer: { select: { id: true, username: true } },
      seller: { select: { id: true, username: true } },
    },
  });
  if (!row) return { error: "Request not found." as const };
  if (row.buyerId !== userId && row.sellerId !== userId) {
    return { error: "Permission denied." as const };
  }
  return {
    request: {
      id: row.id,
      listingId: row.listingId,
      listingTitle: row.listing.title,
      listingStatus: row.listing.status,
      roomId: row.roomId,
      buyerId: row.buyerId,
      sellerId: row.sellerId,
      buyerUsername: row.buyer.username,
      sellerUsername: row.seller.username,
      requestedById: row.requestedById,
      meetAt: row.meetAt?.toISOString() ?? null,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      respondedAt: row.respondedAt?.toISOString() ?? null,
      canRespond:
        row.status === "PENDING" &&
        userId === (row.requestedById === row.sellerId ? row.buyerId : row.sellerId),
    },
  };
}

export async function respondMobileUsedTradeRequest(
  userId: string,
  requestId: string,
  action: "approve" | "reject"
) {
  const row = await db.usedTradeRequest.findUnique({
    where: { id: requestId },
    include: { listing: true },
  });
  if (!row) return { error: "Request not found." as const };
  const initiatorId = row.requestedById ?? row.buyerId;
  const responderId = initiatorId === row.sellerId ? row.buyerId : row.sellerId;
  if (userId !== responderId) return { error: "Only the recipient can respond to the request." as const };
  if (row.status !== "PENDING") return { error: "This request was already handled." as const };

  const now = new Date();
  if (action === "reject") {
    await db.usedTradeRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", respondedAt: now },
    });
    await sendMobileDmMessage(userId, {
      roomId: row.roomId,
      content: "Trade request declined.",
    }).catch(() => undefined);
    return { status: "REJECTED" as const };
  }

  if (row.listing.status !== "SELLING") {
    return { error: "Another trade is already in progress." as const };
  }

  await db.$transaction([
    db.usedTradeRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", respondedAt: now },
    }),
    db.usedTradeRequest.updateMany({
      where: {
        listingId: row.listingId,
        status: "PENDING",
        id: { not: requestId },
      },
      data: { status: "REJECTED", respondedAt: now },
    }),
    db.usedListing.update({
      where: { id: row.listingId },
      data: { status: "RESERVED" },
    }),
  ]);

  await sendMobileDmMessage(userId, {
    roomId: row.roomId,
    content: "Trade request approved. You can't edit the listing now.",
  }).catch(() => undefined);

  return { status: "APPROVED" as const, listingStatus: "RESERVED" as const };
}

export async function respondMobileUsedTradeMeetCompletion(
  userId: string,
  requestId: string,
  action: "confirm" | "decline"
) {
  const row = await db.usedTradeRequest.findUnique({
    where: { id: requestId },
    include: { listing: true },
  });
  if (!row) return { error: "Request not found." as const };
  if (row.buyerId !== userId && row.sellerId !== userId) {
    return { error: "Permission denied." as const };
  }
  if (row.status !== "APPROVED") return { error: "Only approved trades can be marked complete." as const };
  if (!row.meetAt) return { error: "No meetup scheduled." as const };

  const { isUsedTradeMeetCompletionDue } = await import("@/lib/used-trade-meet");
  if (!isUsedTradeMeetCompletionDue(row.meetAt)) {
    return { error: "It's not time to confirm completion yet." as const };
  }
  if (row.meetCompletionDeclinedAt) {
    return { error: "Already marked as incomplete." as const };
  }

  const now = new Date();
  const isBuyer = row.buyerId === userId;
  const alreadyConfirmed = isBuyer ? row.buyerMeetConfirmedAt : row.sellerMeetConfirmedAt;
  if (alreadyConfirmed && action === "confirm") {
    return { status: "ALREADY" as const };
  }

  if (action === "decline") {
    await db.$transaction([
      db.usedTradeRequest.update({
        where: { id: requestId },
        data: { meetCompletionDeclinedAt: now },
      }),
      db.usedListing.update({
        where: { id: row.listingId },
        data: { status: "SELLING" },
      }),
    ]);
    await sendMobileDmMessage(userId, {
      roomId: row.roomId,
      content: "Trade didn't complete; listing is for sale again.",
    }).catch(() => undefined);
    return { status: "DECLINED" as const, listingStatus: "SELLING" as const };
  }

  const buyerMeetConfirmedAt = isBuyer ? now : row.buyerMeetConfirmedAt;
  const sellerMeetConfirmedAt = isBuyer ? row.sellerMeetConfirmedAt : now;

  await db.usedTradeRequest.update({
    where: { id: requestId },
    data: isBuyer ? { buyerMeetConfirmedAt: now } : { sellerMeetConfirmedAt: now },
  });

  if (buyerMeetConfirmedAt && sellerMeetConfirmedAt) {
    await db.usedListing.update({
      where: { id: row.listingId },
      data: { status: "SOLD" },
    });
    await sendMobileDmMessage(userId, {
      roomId: row.roomId,
      content: "Trade completed.",
    }).catch(() => undefined);
    return { status: "COMPLETED" as const, listingStatus: "SOLD" as const };
  }

  return { status: "CONFIRMED_PARTIAL" as const };
}

export async function listMobileUsedMeetPins(userId: string) {
  const [selling, confirmed] = await Promise.all([
    db.usedListing.findMany({
      where: {
        status: "SELLING",
        isNsfw: false,
        meetLat: { not: null },
        meetLng: { not: null },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        title: true,
        price: true,
        currency: true,
        meetPlace: true,
        meetLat: true,
        meetLng: true,
        region: true,
        images: true,
      },
    }),
    db.usedTradeRequest.findMany({
      where: {
        status: "APPROVED",
        OR: [{ buyerId: userId }, { sellerId: userId }],
        listing: { meetLat: { not: null }, meetLng: { not: null } },
      },
      orderBy: { respondedAt: "desc" },
      take: 40,
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            price: true,
            currency: true,
            meetPlace: true,
            meetLat: true,
            meetLng: true,
            region: true,
          },
        },
      },
    }),
  ]);

  const confirmedIds = new Set(confirmed.map((row) => row.listingId));
  const listings = selling
    .filter((row) => !confirmedIds.has(row.id) && row.meetLat != null && row.meetLng != null)
    .map((row) => ({
      id: `listing-${row.id}`,
      listingId: row.id,
      lat: row.meetLat!,
      lng: row.meetLng!,
      title: row.title,
      place: row.meetPlace?.trim() || row.region,
      price: formatUsedPrice(row.price, row.currency),
      image: listingImages(row.images)[0] ?? null,
      meetAt: null as string | null,
      confirmed: false,
    }));

  const meets = confirmed
    .filter((row) => row.listing.meetLat != null && row.listing.meetLng != null)
    .map((row) => ({
      id: `meet-${row.id}`,
      listingId: row.listingId,
      lat: row.listing.meetLat!,
      lng: row.listing.meetLng!,
      title: row.listing.title,
      place: row.listing.meetPlace?.trim() || row.listing.region,
      price: formatUsedPrice(row.listing.price, row.listing.currency),
      image: null as string | null,
      meetAt: row.meetAt?.toISOString() ?? null,
      confirmed: true,
    }));

  return { pins: [...listings, ...meets] };
}
