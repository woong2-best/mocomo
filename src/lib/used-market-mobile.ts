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
  computeAuctionEndsAt,
  DEFAULT_BID_INCREMENT,
} from "@/lib/used-auction";
import {
  formatUsedPrice,
  maxUsedListingPrice,
  maxUsedListingPriceLabel,
  normalizeUsedCurrency,
  listingImages,
} from "@/lib/used-market";
import { isValidUsedRegion } from "@/lib/used-regions-global";
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
import { sendUsedAuctionNotification } from "@/lib/used-auction-notify";
import { executeUsedAuctionBid } from "@/lib/used-auction-bid-core";
import { getOrCreateDmForUser, sendMobileDmMessage } from "@/lib/chat-dm-service";
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
  if (!user) return { error: "로그인이 필요합니다." as const };

  const isAuction = data.saleType === "AUCTION";
  const accessErr = isAuction ? assertAuctionPostAccess(user) : assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  const restricted =
    data.restrictedKind && data.restrictedKind !== "NONE"
      ? (data.restrictedKind as UsedRestrictedKind)
      : "NONE";
  if (isUsedRestrictedKind(restricted)) {
    const adultErr = assertUsedAdultForRestricted(user, restricted);
    if (adultErr) return { error: USED_ADULT_SELLER_MSG };
  }
  if (!data.title.trim()) return { error: "제목을 입력해 주세요." as const };
  const currency = normalizeUsedCurrency(data.currency);
  const price = Math.floor(Number(data.price) || 0);
  if (data.price < 0 || price < 0) return { error: "가격이 올바르지 않습니다." as const };
  const maxPrice = maxUsedListingPrice(currency);
  if (price > maxPrice) {
    return { error: `가격은 ${maxUsedListingPriceLabel(currency)} 이하로 입력해 주세요.` as const };
  }
  if (!data.region.trim()) return { error: "거래 지역을 선택해 주세요." as const };
  const listingCountry = normalizeMeetCountry(data.meetCountry || user.countryCode);
  if (!isValidUsedRegion(data.region, listingCountry)) {
    return { error: "올바른 거래 지역을 선택해 주세요." as const };
  }

  const parsedCats = parseUsedSellCategories(data.categories, data.category);
  if ("error" in parsedCats && parsedCats.error) return { error: parsedCats.error };

  if (isAuction && price <= 0) return { error: "경매 시작가를 입력해 주세요." as const };
  if (isAuction && !data.auctionHours) return { error: "경매 기간을 선택해 주세요." as const };
  if (isAuction) {
    const balance = await getMocoBalanceSnapshot(userId);
    if (!canParticipateInAuction(balance)) return { error: AUCTION_SELLER_DEPOSIT_ERROR };
  }

  const bidIncrement = Math.floor(data.bidIncrement ?? DEFAULT_BID_INCREMENT);
  const buyNowPrice =
    data.buyNowPrice != null && data.buyNowPrice > 0 ? Math.floor(data.buyNowPrice) : null;
  const reservePrice =
    data.reservePrice != null && data.reservePrice > 0 ? Math.floor(data.reservePrice) : null;

  if (buyNowPrice != null && buyNowPrice <= price) {
    return { error: "즉시구매가는 시작가보다 높아야 합니다." as const };
  }

  const ephemeral = data.images.filter(
    (u) =>
      typeof u === "string" &&
      (u.startsWith("blob:") || (process.env.VERCEL && u.startsWith("/uploads/")))
  );
  if (ephemeral.length > 0) {
    return {
      error: "사진이 영구 저장되지 않았습니다. 사진을 다시 추가해 주세요." as const,
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
      !data.region.includes("전국 택배") &&
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
              auctionEndsAt: computeAuctionEndsAt(data.auctionHours!),
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
      return { error: "중고거래 DB가 준비되지 않았습니다." as const };
    }
    console.error("[createMobileUsedListing]", e);
    return { error: "글 등록에 실패했습니다. 잠시 후 다시 시도해 주세요." as const };
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

export async function toggleMobileUsedFavorite(userId: string, listingId: string) {
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "로그인이 필요합니다." as const };

  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: { sellerId: true, meetCountry: true, region: true },
  });
  if (!listing) return { error: "게시글을 찾을 수 없습니다." as const };
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
  return { favorited: true as const };
}

export async function startMobileUsedTradeChat(userId: string, listingId: string) {
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "로그인이 필요합니다." as const };

  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    include: { seller: { select: { id: true, username: true } } },
  });
  if (!listing) return { error: "게시글을 찾을 수 없습니다." as const };
  if (listing.sellerId === userId) return { error: "본인 글에는 채팅할 수 없습니다." as const };
  const tradeErr = await assertUsedMarketTradeAccess({
    userId,
    buyerCountry: user.countryCode,
    listing,
  });
  if (tradeErr) return { error: tradeErr };
  if (listing.status === "SOLD") return { error: "이미 거래 완료된 상품입니다." as const };
  if (
    listing.saleType === "AUCTION" &&
    listing.auctionEndsAt &&
    listing.auctionEndsAt.getTime() > Date.now() &&
    listing.auctionState !== "ENDED"
  ) {
    return { error: "경매 진행 중에는 채팅 대신 입찰을 이용해 주세요." as const };
  }

  const adultErr = assertUsedAdultForRestricted(user, listing.restrictedKind ?? "NONE");
  if (adultErr) return { error: adultErr, needsAdultVerify: true as const };

  const dm = await getOrCreateDmForUser(userId, listing.sellerId);
  if ("error" in dm && dm.error) {
    return { error: dm.error, requiredTier: "requiredTier" in dm ? dm.requiredTier : undefined };
  }
  if (!("roomId" in dm) || !dm.roomId) return { error: "채팅방을 열 수 없습니다." as const };

  try {
    await db.usedListingChat.upsert({
      where: { listingId_buyerId: { listingId, buyerId: userId } },
      create: { listingId, roomId: dm.roomId, buyerId: userId },
      update: { roomId: dm.roomId },
    });
  } catch {
    /* optional table */
  }

  const priceText = formatUsedPrice(listing.price, listing.currency);
  const intro = `안녕하세요! 중고거래 문의합니다.\n\n상품: ${listing.title}\n가격: ${priceText}\n링크: /used/${listing.id}`;
  await sendMobileDmMessage(userId, { roomId: dm.roomId, content: intro }).catch(() => undefined);

  return { roomId: dm.roomId };
}

export async function placeMobileUsedAuctionBid(
  userId: string,
  listingId: string,
  amount: number,
  termsAccepted?: boolean,
  opts?: { paymentIntentDbId?: string | null }
) {
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "로그인이 필요합니다." as const };

  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  if (!termsAccepted) {
    return { error: "입찰 전 결제 의무 및 이용 제한 안내에 동의해 주세요." as const };
  }

  const bidAmount = Math.floor(amount);
  if (!Number.isFinite(bidAmount) || bidAmount <= 0) {
    return { error: "입찰가를 올바르게 입력해 주세요." as const };
  }

  try {
    await finalizeExpiredAuctionIfNeeded(listingId);

    const listing = await db.usedListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.saleType !== "AUCTION") {
      return { error: "경매 상품이 아닙니다." as const };
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
    await sendUsedAuctionNotification({
      userId: listing.sellerId,
      type: "bid",
      title: "새 입찰",
      body: `${listing.title} · ${formatUsedPrice(result.amount, listing.currency)}`,
      link,
      actorId: userId,
    });

    const prevBidderId = listing.currentBidderId;
    if (prevBidderId && prevBidderId !== userId) {
      await sendUsedAuctionNotification({
        userId: prevBidderId,
        type: "outbid",
        title: "입찰 갱신됨",
        body: `${listing.title} · ${formatUsedPrice(result.amount, listing.currency)}`,
        link,
        actorId: userId,
      });
    }

    return { success: true as const, amount: result.amount, extended: result.extended };
  } catch (e) {
    console.error("[placeMobileUsedAuctionBid]", e);
    return { error: "입찰에 실패했습니다. 잠시 후 다시 시도해 주세요." as const };
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
  sellerId: true,
  auctionEndsAt: true,
  currentBidAmount: true,
  bidCount: true,
  seller: { select: { id: true, username: true, image: true } },
  _count: { select: { favorites: true } },
} as const;

function mapHubListing(
  l: Prisma.UsedListingGetPayload<{ select: typeof hubListingSelect }>
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
  return rows.map((row) => mapHubListing(row.listing));
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
  return listings.map(mapHubListing);
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
  if (mine.length > 0) return mine.map(mapHubListing);
  const open = await db.usedListing.findMany({
    where: { saleType: "AUCTION", status: "SELLING" },
    orderBy: { createdAt: "desc" },
    take: Math.min(take, 48),
    select: hubListingSelect,
  });
  return open.map(mapHubListing);
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
  return scored.slice(0, limit).map((row) => mapHubListing(row.listing));
}

function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function isUsedListingEditable(status: string) {
  return status === "SELLING";
}

export async function deleteMobileUsedListing(userId: string, listingId: string) {
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== userId) return { error: "권한이 없습니다." as const };
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "로그인이 필요합니다." as const };
  const accessErr =
    listing.saleType === "AUCTION" ? assertAuctionPostAccess(user) : assertUsedMarketAccess(user);
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
  if (!listing || listing.sellerId !== userId) return { error: "권한이 없습니다." as const };
  if (listing.saleType !== "FIXED") return { error: "경매 글은 끌어올릴 수 없습니다." as const };
  if (!isUsedListingEditable(listing.status)) {
    return { error: "거래 진행 중이거나 완료된 글은 끌어올릴 수 없습니다." as const };
  }
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "로그인이 필요합니다." as const };
  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  const dayStart = startOfUtcDay();
  if (listing.lastBumpedAt && listing.lastBumpedAt >= dayStart) {
    return { error: "끌어올리기는 하루에 한 번만 할 수 있습니다." as const };
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
  if (!listing || listing.sellerId !== userId) return { error: "권한이 없습니다." as const };
  if (!isUsedListingEditable(listing.status)) {
    return { error: "거래가 진행 중이어서 수정할 수 없습니다." as const };
  }
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "로그인이 필요합니다." as const };
  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  const title = (data.title ?? listing.title).trim();
  if (!title) return { error: "제목을 입력해 주세요." as const };
  const currency = normalizeUsedCurrency(data.currency ?? listing.currency);
  const price =
    data.price !== undefined ? Math.floor(Number(data.price) || 0) : listing.price;
  if (price < 0) return { error: "가격이 올바르지 않습니다." as const };
  const maxPrice = maxUsedListingPrice(currency);
  if (price > maxPrice) {
    return { error: `가격은 ${maxUsedListingPriceLabel(currency)} 이하로 입력해 주세요.` as const };
  }
  const region = (data.region ?? listing.region).trim();
  if (!region) return { error: "거래 지역을 선택해 주세요." as const };

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
  } catch {
    pendingRequestId = null;
  }

  return {
    listingId: listing.id,
    listingTitle: listing.title,
    listingStatus: listing.status,
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
  };
}

export async function createMobileUsedTradeRequest(
  userId: string,
  listingId: string,
  roomId: string,
  meetAtIso: string
) {
  const user = await loadUsedMarketUser(userId);
  if (!user) return { error: "로그인이 필요합니다." as const };
  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };

  const meetAt = new Date(meetAtIso);
  if (Number.isNaN(meetAt.getTime()) || meetAt.getTime() < Date.now() - 60_000) {
    return { error: "거래 날짜와 시간을 선택해 주세요." as const };
  }

  const link = await db.usedListingChat.findFirst({
    where: { listingId, roomId },
    include: {
      listing: {
        select: { id: true, sellerId: true, status: true, saleType: true, title: true },
      },
    },
  });
  if (!link?.listing) return { error: "이 채팅방에서 거래 요청을 할 수 없습니다." as const };
  const listing = link.listing;
  const isBuyer = link.buyerId === userId;
  const isSeller = listing.sellerId === userId;
  if (!isBuyer && !isSeller) return { error: "이 채팅방에서 거래 요청을 할 수 없습니다." as const };
  if (listing.saleType !== "FIXED") return { error: "경매 상품은 거래 요청을 사용할 수 없습니다." as const };
  if (listing.status !== "SELLING") {
    return { error: "이미 거래 진행 중이거나 완료된 상품입니다." as const };
  }

  const existingPending = await db.usedTradeRequest.findFirst({
    where: { listingId, roomId, status: "PENDING" },
  });
  if (existingPending) {
    return { error: "이미 거래 요청을 보냈습니다." as const, requestId: existingPending.id };
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
  if (!row) return { error: "요청을 찾을 수 없습니다." as const };
  if (row.buyerId !== userId && row.sellerId !== userId) {
    return { error: "권한이 없습니다." as const };
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
  if (!row) return { error: "요청을 찾을 수 없습니다." as const };
  const initiatorId = row.requestedById ?? row.buyerId;
  const responderId = initiatorId === row.sellerId ? row.buyerId : row.sellerId;
  if (userId !== responderId) return { error: "요청을 받은 사람만 응답할 수 있습니다." as const };
  if (row.status !== "PENDING") return { error: "이미 처리된 요청입니다." as const };

  const now = new Date();
  if (action === "reject") {
    await db.usedTradeRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", respondedAt: now },
    });
    await sendMobileDmMessage(userId, {
      roomId: row.roomId,
      content: "거래 요청을 거절했습니다.",
    }).catch(() => undefined);
    return { status: "REJECTED" as const };
  }

  if (row.listing.status !== "SELLING") {
    return { error: "이미 다른 거래가 진행 중입니다." as const };
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
    content: "거래 요청을 승인했습니다. 이제 글을 수정할 수 없습니다.",
  }).catch(() => undefined);

  return { status: "APPROVED" as const, listingStatus: "RESERVED" as const };
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
