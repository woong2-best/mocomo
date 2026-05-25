"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { getOrCreateDM, sendMessage } from "@/actions/chat";
import type { Prisma, UsedListingCategory, UsedListingStatus } from "@prisma/client";

export async function getUsedListings(params?: {
  q?: string;
  category?: string;
  region?: string;
  status?: UsedListingStatus;
  sellerId?: string;
  take?: number;
}) {
  const status = params?.status ?? "SELLING";
  const where: Prisma.UsedListingWhereInput = { status };

  if (params?.category) where.category = params.category as UsedListingCategory;
  if (params?.region) where.region = params.region;
  if (params?.sellerId) where.sellerId = params.sellerId;
  if (params?.q?.trim()) {
    where.OR = [
      { title: { contains: params.q.trim(), mode: "insensitive" } },
      { description: { contains: params.q.trim(), mode: "insensitive" } },
    ];
  }

  try {
    return await db.usedListing.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: params?.take ?? 48,
      include: {
        seller: { select: { id: true, username: true, image: true, name: true } },
        _count: { select: { favorites: true } },
      },
    });
  } catch {
    return [];
  }
}

export async function getUsedListing(id: string, viewerId?: string) {
  try {
    const listing = await db.usedListing.findUnique({
      where: { id },
      include: {
        seller: { select: { id: true, username: true, image: true, name: true, createdAt: true } },
        _count: { select: { favorites: true } },
      },
    });
    if (!listing) return null;

    await db.usedListing.update({
      where: { id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    let favorited = false;
    if (viewerId) {
      const fav = await db.usedFavorite.findUnique({
        where: { userId_listingId: { userId: viewerId, listingId: id } },
      });
      favorited = !!fav;
    }

    return { listing, favorited };
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
  images: string[];
}) {
  const user = await requireAuth();
  if (!data.title.trim()) return { error: "제목을 입력해 주세요." };
  if (data.price < 0) return { error: "가격이 올바르지 않습니다." };
  if (!data.region.trim()) return { error: "거래 지역을 선택해 주세요." };

  try {
    const listing = await db.usedListing.create({
      data: {
        sellerId: user.id,
        title: data.title.trim(),
        description: data.description.trim(),
        price: Math.floor(data.price),
        category: (data.category as UsedListingCategory) || "OTHER",
        region: data.region.trim(),
        images: data.images as Prisma.InputJsonValue,
      },
    });
    revalidatePath("/used");
    revalidatePath("/used/my");
    return { listingId: listing.id };
  } catch {
    return { error: "중고거래 DB가 준비되지 않았습니다. Supabase SQL 섹션 K를 실행해 주세요." };
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

/** 당근마켓식 — 판매자와 1:1 채팅 */
export async function startUsedTradeChat(listingId: string) {
  const user = await requireAuth();
  const listing = await db.usedListing.findUnique({
    where: { id: listingId },
    include: { seller: { select: { id: true, username: true } } },
  });
  if (!listing) return { error: "게시글을 찾을 수 없습니다." };
  if (listing.sellerId === user.id) return { error: "본인 글에는 채팅할 수 없습니다." };
  if (listing.status === "SOLD") return { error: "이미 거래 완료된 상품입니다." };

  const dm = await getOrCreateDM(listing.sellerId);
  if ("error" in dm && dm.error) return { error: dm.error };
  if (!("room" in dm) || !dm.room) return { error: "채팅방을 열 수 없습니다." };

  const intro = `안녕하세요! 중고거래 문의합니다.\n\n📦 ${listing.title}\n💰 ${listing.price === 0 ? "나눔" : `${listing.price.toLocaleString()}원`}\n🔗 /used/${listing.id}`;
  try {
    await sendMessage({ roomId: dm.room.id, content: intro });
  } catch {
    /* 메시지 실패해도 방으로 이동 */
  }

  return { roomId: dm.room.id };
}
