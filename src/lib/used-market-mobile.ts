import { Prisma, type UsedListingCategory, type UsedRestrictedKind } from "@prisma/client";
import { db } from "@/lib/db";
import { assertUsedMarketAccess } from "@/lib/used-market-access";
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

const usedMarketUserSelect = {
  id: true,
  countryCode: true,
  bankVerifiedAt: true,
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
    category: string;
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

  const accessErr = assertUsedMarketAccess(user);
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
  if (!isValidUsedRegion(data.region, user.countryCode)) {
    return { error: "올바른 거래 지역을 선택해 주세요." as const };
  }

  const isAuction = data.saleType === "AUCTION";
  if (isAuction && price <= 0) return { error: "경매 시작가를 입력해 주세요." as const };
  if (isAuction && !data.auctionHours) return { error: "경매 기간을 선택해 주세요." as const };

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
    const meetCountry = normalizeMeetCountry(data.meetCountry ?? user.countryCode);
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

    const listing = await db.usedListing.create({
      data: {
        sellerId: userId,
        title: data.title.trim(),
        description: data.description.trim(),
        price,
        currency,
        category: (data.category as UsedListingCategory) || "OTHER",
        workTitle: normalizedWork,
        animeSlug,
        productType:
          data.productType?.trim() && isValidProductType(data.productType.trim())
            ? data.productType.trim()
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
    void notifyWtbAlertsForListing(listing.id).catch(() => undefined);
    return { listingId: listing.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
      return { error: "중고거래 DB가 준비되지 않았습니다." as const };
    }
    console.error("[createMobileUsedListing]", e);
    return { error: "글 등록에 실패했습니다. 잠시 후 다시 시도해 주세요." as const };
  }
}

export async function listMobileMyUsedListings(userId: string) {
  const listings = await db.usedListing.findMany({
    where: { sellerId: userId },
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

    const link = `/used/${listingId}`;
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
