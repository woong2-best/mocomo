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
} from "@prisma/client";
import {
  getSidoRegionPrefix,
  isValidUsedRegion,
  USED_SHIPPING_REGION,
} from "@/lib/korea-regions";
import { finalizeExpiredAuctionIfNeeded } from "@/actions/used-auction";
import {
  computeAuctionEndsAt,
  DEFAULT_BID_INCREMENT,
  isAuctionLive,
} from "@/lib/used-auction";
import { MAX_USED_LISTING_PRICE, MAX_USED_LISTING_PRICE_LABEL } from "@/lib/used-market";
import {
  isUsedMarketEligible,
  USED_KR_ONLY_MSG,
  USED_PHONE_REQUIRED_MSG,
} from "@/lib/used-phone-auth";
import {
  assertUsedAdultForRestricted,
  isUsedRestrictedKind,
  USED_ADULT_SELLER_MSG,
} from "@/lib/used-youth-protection";

function assertUsedMarketAccess(user: {
  countryCode: string;
  phoneVerified: Date | null;
}) {
  if (user.countryCode !== "KR") return USED_KR_ONLY_MSG;
  if (!isUsedMarketEligible(user)) return USED_PHONE_REQUIRED_MSG;
  return null;
}

export async function isUsedDbReady() {
  try {
    await db.usedListing.findFirst({ select: { id: true } });
    return true;
  } catch {
    return false;
  }
}

export async function getUsedListings(params?: {
  q?: string;
  category?: string;
  region?: string;
  /** 시·도 전체 — 해당 시·도 접두사로 region 필터 */
  sido?: string;
  status?: UsedListingStatus;
  sellerId?: string;
  take?: number;
  /** FIXED | AUCTION */
  saleType?: "FIXED" | "AUCTION";
  /** 진행 중 경매만 (마감 전) */
  liveAuctionOnly?: boolean;
}) {
  const status = params?.status ?? "SELLING";
  const where: Prisma.UsedListingWhereInput = { status };

  if (params?.saleType) where.saleType = params.saleType;

  const andFilters: Prisma.UsedListingWhereInput[] = [];
  if (params?.liveAuctionOnly) {
    andFilters.push({
      saleType: "AUCTION",
      auctionEndsAt: { gt: new Date() },
      OR: [{ auctionState: "LIVE" }, { auctionState: null }],
    });
  }

  if (params?.category) where.category = params.category as UsedListingCategory;
  if (params?.sido) {
    if (params.sido === "__shipping__") {
      where.region = USED_SHIPPING_REGION;
    } else {
      const prefix = getSidoRegionPrefix(params.sido);
      if (prefix) where.region = { startsWith: prefix };
    }
  } else if (params?.region) {
    where.region = params.region;
  }
  if (params?.sellerId) where.sellerId = params.sellerId;
  if (params?.q?.trim()) {
    andFilters.push({
      OR: [
        { title: { contains: params.q.trim(), mode: "insensitive" } },
        { description: { contains: params.q.trim(), mode: "insensitive" } },
      ],
    });
  }
  if (andFilters.length) where.AND = andFilters;

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

export async function getUsedListing(id: string, viewerId?: string) {
  try {
    await finalizeExpiredAuctionIfNeeded(id);

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

    await db.usedListing.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    let favorited = false;
    let buyerChatRoomId: string | null = null;
    let myHighestBid: number | null = null;
    let isWinningBidder = false;
    let viewerAdultVerified = false;
    if (viewerId) {
      const viewer = await db.user.findUnique({
        where: { id: viewerId },
        select: { adultVerifiedAt: true },
      }).catch(() => null);
      viewerAdultVerified = !!viewer?.adultVerifiedAt;

      const fav = await db.usedFavorite.findUnique({
        where: { userId_listingId: { userId: viewerId, listingId: id } },
      });
      favorited = !!fav;
      const tradeChat = await db.usedListingChat.findUnique({
        where: { listingId_buyerId: { listingId: id, buyerId: viewerId } },
        select: { roomId: true },
      }).catch(() => null);
      buyerChatRoomId = tradeChat?.roomId ?? null;
      if (listing.saleType === "AUCTION") {
        isWinningBidder = listing.currentBidderId === viewerId;
        const myBid = await db.usedAuctionBid.findFirst({
          where: { listingId: id, bidderId: viewerId },
          orderBy: { amount: "desc" },
          select: { amount: true },
        }).catch(() => null);
        myHighestBid = myBid?.amount ?? null;
      }
    }

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

    return {
      listing,
      favorited,
      favoriteCount,
      chatCount,
      buyerChatRoomId,
      auctionLive,
      myHighestBid,
      isWinningBidder,
      viewerAdultVerified,
    };
  } catch {
    return null;
  }
}

export async function createUsedListing(data: {
  title: string;
  description: string;
  price: number;
  category: string;
  region: string;
  meetPlace?: string;
  images: string[];
  saleType?: "FIXED" | "AUCTION";
  auctionHours?: number;
  bidIncrement?: number;
  buyNowPrice?: number;
  reservePrice?: number;
  restrictedKind?: UsedRestrictedKind | string;
}) {
  const user = await requireAuth();
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
  if (!data.title.trim()) return { error: "제목을 입력해 주세요." };
  const price = Math.floor(Number(data.price) || 0);
  if (data.price < 0 || price < 0) return { error: "가격이 올바르지 않습니다." };
  if (price > MAX_USED_LISTING_PRICE) {
    return { error: `가격은 ${MAX_USED_LISTING_PRICE_LABEL} 이하로 입력해 주세요.` };
  }
  if (!data.region.trim()) return { error: "거래 지역을 선택해 주세요." };
  if (!isValidUsedRegion(data.region)) return { error: "올바른 거래 지역을 선택해 주세요." };

  const isAuction = data.saleType === "AUCTION";
  if (isAuction && price <= 0) return { error: "경매 시작가를 입력해 주세요." };
  if (isAuction && !data.auctionHours) return { error: "경매 기간을 선택해 주세요." };

  const bidIncrement = Math.floor(data.bidIncrement ?? DEFAULT_BID_INCREMENT);
  const buyNowPrice =
    data.buyNowPrice != null && data.buyNowPrice > 0
      ? Math.floor(data.buyNowPrice)
      : null;
  const reservePrice =
    data.reservePrice != null && data.reservePrice > 0
      ? Math.floor(data.reservePrice)
      : null;

  if (buyNowPrice != null && buyNowPrice <= price) {
    return { error: "즉시구매가는 시작가보다 높아야 합니다." };
  }
  if (reservePrice != null && reservePrice > price && reservePrice > (buyNowPrice ?? Infinity)) {
    return { error: "최저 낙찰가 설정을 확인해 주세요." };
  }

  try {
    const listing = await db.usedListing.create({
      data: {
        sellerId: user.id,
        title: data.title.trim(),
        description: data.description.trim(),
        price,
        category: (data.category as UsedListingCategory) || "OTHER",
        restrictedKind: restricted,
        region: data.region.trim(),
        meetPlace: data.meetPlace?.trim() || null,
        images: data.images as Prisma.InputJsonValue,
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
    revalidatePath("/used");
    revalidatePath("/used/my");
    return { listingId: listing.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2021") {
        return { error: "중고거래 DB가 준비되지 않았습니다. Supabase SQL 섹션 K를 실행해 주세요." };
      }
    }
    console.error("[createUsedListing]", e);
    return {
      error:
        "글 등록에 실패했습니다. 가격·사진·지역을 확인한 뒤 다시 시도해 주세요.",
    };
  }
}

export async function updateUsedListingStatus(listingId: string, status: UsedListingStatus) {
  const user = await requireAuth();
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== user.id) return { error: "권한이 없습니다." };

  await db.usedListing.update({ where: { id: listingId }, data: { status } });
  revalidatePath(`/used/${listingId}`);
  revalidatePath("/used/my");
  revalidatePath("/used");
  return { success: true };
}

export async function deleteUsedListing(listingId: string) {
  const user = await requireAuth();
  const listing = await db.usedListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== user.id) return { error: "권한이 없습니다." };

  await db.usedListing.delete({ where: { id: listingId } });
  revalidatePath("/used");
  revalidatePath("/used/my");
  return { success: true };
}

export async function toggleUsedFavorite(listingId: string) {
  const user = await requireAuth();
  const existing = await db.usedFavorite.findUnique({
    where: { userId_listingId: { userId: user.id, listingId } },
  });
  if (existing) {
    await db.usedFavorite.delete({ where: { id: existing.id } });
    revalidatePath(`/used/${listingId}`);
    return { favorited: false };
  }
  await db.usedFavorite.create({ data: { userId: user.id, listingId } });
  revalidatePath(`/used/${listingId}`);
  return { favorited: true };
}

export async function getMyUsedDashboard() {
  const user = await requireAuth();
  try {
    const [selling, reserved, sold, favorites] = await Promise.all([
      db.usedListing.findMany({
        where: { sellerId: user.id, status: "SELLING" },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      db.usedListing.findMany({
        where: { sellerId: user.id, status: "RESERVED" },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      db.usedListing.findMany({
        where: { sellerId: user.id, status: "SOLD" },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      db.usedFavorite.findMany({
        where: { userId: user.id },
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

/** 판매자와 1:1 DM으로 거래 문의 */
export async function startUsedTradeChat(listingId: string) {
  const user = await requireAuth();
  const accessErr = assertUsedMarketAccess(user);
  if (accessErr) return { error: accessErr };
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    include: { seller: { select: { id: true, username: true } } },
  });
  if (!listing) return { error: "게시글을 찾을 수 없습니다." };
  if (listing.sellerId === user.id) return { error: "본인 글에는 채팅할 수 없습니다." };
  if (listing.status === "SOLD") return { error: "이미 거래 완료된 상품입니다." };
  if (
    listing.saleType === "AUCTION" &&
    listing.auctionEndsAt &&
    listing.auctionEndsAt.getTime() > Date.now() &&
    listing.auctionState !== "ENDED"
  ) {
    return { error: "경매 진행 중에는 채팅 대신 입찰을 이용해 주세요." };
  }

  const adultErr = assertUsedAdultForRestricted(
    user,
    listing.restrictedKind ?? "NONE"
  );
  if (adultErr) return { error: adultErr, needsAdultVerify: true as const };

  const dm = await getOrCreateDM(listing.sellerId);
  if ("error" in dm && dm.error) return { error: dm.error };
  if (!("room" in dm) || !dm.room) return { error: "채팅방을 열 수 없습니다." };

  try {
    await db.usedListingChat.upsert({
      where: { listingId_buyerId: { listingId, buyerId: user.id } },
      create: { listingId, roomId: dm.room.id, buyerId: user.id },
      update: { roomId: dm.room.id },
    });
  } catch {
    /* DB 미적용 시에도 채팅은 진행 */
  }

  const priceText = listing.price === 0 ? "나눔" : `${listing.price.toLocaleString()}원`;
  const intro = `안녕하세요! 중고거래 문의합니다.\n\n상품: ${listing.title}\n가격: ${priceText}\n링크: /used/${listing.id}`;
  try {
    await sendMessage({ roomId: dm.room.id, content: intro });
  } catch {
    /* 메시지 실패해도 방으로 이동 */
  }

  revalidatePath(`/used/${listingId}`);
  return { roomId: dm.room.id };
}

/** 판매자 — 이 글에 연결된 채팅방 목록 */
export async function getUsedListingChatRooms(listingId: string) {
  const user = await requireAuth();
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    select: { sellerId: true },
  });
  if (!listing || listing.sellerId !== user.id) return { error: "권한이 없습니다." };

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
